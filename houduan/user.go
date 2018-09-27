package main

import (
	"errors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"strconv"
)

var (
	errNotLogin = errors.New("not login")
)

type userLogin struct {
	Phone string `json:"phone" binding:"required,len=11"`
	YZM   string `json:"yzm"   binding:"required,len=6"`
}
type userRegister struct {
	userLogin
	Name string `json:"name" binding:"required,max=8"`
}
type userInfo struct {
	ID        int64 `db:"id"      json:"id"`
	OpenID    string
	Name      string  `db:"name"  json:"name"`
	Money     float64 `db:"money" json:"money"`
	Key       string  `           json:"key"`
	AvatorURL string  `           json:"avatorURL"`
	Avator    []byte
}

// register 用户注册
func register(c *gin.Context) {
	var ur userRegister
	err := c.BindJSON(&ur)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	db := c.MustGet("DB").(*sqlx.DB)
	query := `INSERT INTO users (name, phone, money) VALUES ($1, $2, $3)`
	_, err = db.Exec(query, ur.Name, ur.Phone, 1000000)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200})
}

// login 用户登录
func login(c *gin.Context) {
	var ul userLogin
	err := c.BindJSON(&ul)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	var id int64
	var name string
	var money float64
	db := c.MustGet("DB").(*sqlx.DB)
	query := `SELECT id, name, money FROM users WHERE phone = $1`
	err = db.QueryRow(query, ul.Phone).Scan(&id, &name, &money)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	if ul.YZM != "888888" {
		c.JSON(200, gin.H{"code": 401})
	}

	session := sessions.Default(c)
	session.Set("uid", id)
	err = session.Save()
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	key, err := jiami("43jsdoij^T%fdkjf*fjdJJ2nkjs8*IOi", strconv.Itoa(int(id)))
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200, "data": gin.H{"userID": id, "name": name, "money": money, "key": key}})
}

// userIsExists 判断用户是否存在
func userIsExists(c *gin.Context, openid string) (int64, error) {
	db := c.MustGet("DB").(*sqlx.DB)

	var id int64
	query := "SELECT id FROM users WHERE openid = $1"
	err := db.QueryRow(query, openid).Scan(&id)
	return id, err
}

// createUser 新建用户
func createUser(c *gin.Context, ui userInfo) (int64, error) {
	db := c.MustGet("DB").(*sqlx.DB)

	var id int64
	query := "INSERT INTO users (openid, name, money, avator) VALUES ($1, $2, $3, $4) RETURNING id"
	err := db.QueryRow(query, ui.OpenID, ui.Name, ui.Money, ui.Avator).Scan(&id)

	return id, err
}

// getUserInfo 获取用户信息
func getUserInfo(c *gin.Context) {
	db := c.MustGet("DB").(*sqlx.DB)

	session := sessions.Default(c)
	userID, ok := session.Get("uid").(int64)
	if !ok {
		c.Error(errNotLogin).SetType(gin.ErrorTypePrivate)
		return
	}

	var ui userInfo
	query := "SELECT id, name, money FROM users WHERE id = $1"
	err := db.QueryRowx(query, userID).StructScan(&ui)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	ui.Key, err = jiami("43jsdoij^T%fdkjf*fjdJJ2nkjs8*IOi", strconv.Itoa(int(ui.ID)))
	ui.AvatorURL = "/user_avator/" + strconv.Itoa(int(ui.ID))
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200, "data": ui})
}

// getUserAvator 获取用户头像
func getUserAvator(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	db := c.MustGet("DB").(*sqlx.DB)
	query := "SELECT avator FROM users WHERE id = $1"
	var avator []byte
	err = db.QueryRow(query, userID).Scan(&avator)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.Data(200, "image/jpeg", avator)
}

// getUserName 根据id获取用户名
func getUserName(db *sqlx.DB, userID int64) (string, error) {
	var name string
	err := db.QueryRow("SELECT name FROM users WHERE id = $1", userID).Scan(&name)
	return name, err
}

// searchUser 查找用户
func searchUser(c *gin.Context) {
	type UserIDAndName struct {
		ID   int64  `db:"id"   json:"id"`
		Name string `db:"name" json:"name"`
	}
	key := c.Query("key")

	db := c.MustGet("DB").(*sqlx.DB)
	query := "SELECT id, name FROM users WHERE name LIKE '%' || $1 || '%' LIMIT 15"
	rows, err := db.Queryx(query, key)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer rows.Close()

	list := []UserIDAndName{}
	for rows.Next() {
		var u UserIDAndName
		err := rows.StructScan(&u)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		list = append(list, u)
	}

	c.JSON(200, gin.H{"code": 200, "data": list})
}

// recharge 用户充值
func recharge(c *gin.Context) {
	session := sessions.Default(c)
	userID, ok := session.Get("uid").(int64)
	if !ok {
		c.Error(errNotLogin).SetType(gin.ErrorTypePrivate)
		return
	}

	config := c.MustGet("config").(configuration)
	if config.Admin != userID { // 判断是否管理员用户
		return
	}

	type R struct {
		UserID int64   `json:"userID"`
		Money  float64 `json:"money"`
	}
	var r R
	err := c.BindJSON(&r)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	// 充值
	db := c.MustGet("DB").(*sqlx.DB)
	query := "UPDATE users SET money = money + $1 WHERE id = $2"
	_, err = db.Exec(query, r.Money, r.UserID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200})
}
