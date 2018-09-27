// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"errors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"strconv"
	"time"
)

// Room maintains the set of active clients and broadcasts messages to the
// clients.
type Room struct {
	id int64

	// Registered clients.
	clients map[int64]*Client

	// Inbound messages from the clients.
	broadcast chan interface{}

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	// 关闭自动发包机器人
	closeRobot map[int64]chan bool
}

type roomSetting struct {
	ID                *int64                        `db:"id"        json:"id"`
	Name              string                        `db:"name"      json:"name"`
	Hours             int64                         `               json:"hours,omitempty"`
	TempTime          time.Time                     `db:"end_time"  json:"-"`
	EndTime           string                        `               json:"endTime"`
	MinParts          int64                         `db:"min_parts" json:"minParts"`
	MaxParts          int64                         `db:"max_parts" json:"maxParts"`
	MinMoney          float64                       `db:"min_money" json:"minMoney"`
	MaxMoney          float64                       `db:"max_money" json:"maxMoney"`
	Welfare           map[string]float64            `               json:"welfare"`
	SingleMineWelfare map[string]float64            `               json:"singleMineWelfare"`
	MultiMineWelfare  map[string]float64            `               json:"multiMineWelfare"`
	Mine              map[string]map[string]float64 `               json:"mine"`
	Ms                bool                          `db:"ms"        json:"ms"`
	Wbms              bool                          `db:"wbms"      json:"wbms"`
	Jq                bool                          `db:"jq"        json:"jq"`
	Fzqb              bool                          `db:"fzqb"      json:"fzqb"`
}

// destroyRoom 回收房间
func destroyRoom(id int64) error {
	// 筹码归零、记录备份清零(红包、筹码、聊天…)、更新房间状态(is_using)、websocket连接断开、关闭channel、销毁room变量、删除房间列表项
	return nil
}

// newRoom 初始化房间
func newRoom(c *gin.Context) {
	var p roomSetting

	err := c.BindJSON(&p)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	db := c.MustGet("DB").(*sqlx.DB)

	// 判断是否可用
	if p.ID != nil {
		var isUsing bool
		query := "SELECT is_using FROM room WHERE id = $1"
		err := db.QueryRow(query, *p.ID).Scan(isUsing)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		if isUsing {
			c.Error(errors.New("the room is using")).SetType(gin.ErrorTypePrivate)
			return
		}
	}

	// 进入事务
	tx, err := db.Beginx()
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer tx.Rollback()

	// 判断用户是否登录并获取ID
	session := sessions.Default(c)
	userID, ok := session.Get("uid").(int64)
	if !ok {
		c.Error(errNotLogin).SetType(gin.ErrorTypePrivate)
		return
	}

	// 检查禁抢与尾巴免死是否冲突
	if p.Jq == true && p.Wbms == true {
		c.Error(errors.New(`"禁抢"与"尾巴免死"只能二选一`)).SetType(gin.ErrorTypePublic)
		return
	}

	// 扣除房间使用费
	var money float64
	query := "SELECT money FROM users WHERE id = $1"
	err = tx.QueryRow(query, userID).Scan(&money)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	fee := float64(p.Hours * 210)
	if money-fee < 0 {
		c.Error(errors.New("余额不足")).SetType(gin.ErrorTypePublic)
		return
	}
	query = "UPDATE users SET money = $1 WHERE id = $2"
	_, err = tx.Exec(query, money-fee, userID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	// 更新房间信息并设置游戏规则
	if p.ID != nil {
		query := "UPDATE room SET name = $1, owner_id = $2, start_time = $3, hours = $4, min_parts = $5, max_parts = $6, min_money = $ 7, max_money = $8, ms = $9, wbms = $10, jq = $11, fzqb = $12, is_using = $13 WHERE id = $14"
		_, err := tx.Exec(query, p.Name, userID, time.Now(), p.Hours, p.MinParts, p.MaxParts, p.MinMoney, p.MaxMoney, p.Ms, p.Wbms, p.Jq, p.Fzqb, true, p.ID)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
	} else {
		var id int64
		query := "INSERT INTO room (name, owner_id, start_time, hours, min_parts, max_parts, min_money, max_money, ms, wbms, jq, fzqb, is_using) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id"
		err := tx.QueryRow(query, p.Name, userID, time.Now(), p.Hours, p.MinParts, p.MaxParts, p.MinMoney, p.MaxMoney, p.Ms, p.Wbms, p.Jq, p.Fzqb, true).Scan(&id)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		p.ID = &id
	}

	// 发放豆子
	query = "INSERT INTO money (user_id, room_id, money) VALUES ($1, $2, $3) " +
		"ON CONFLICT (id) DO UPDATE SET money = $4"
	_, err = tx.Exec(query, userID, p.ID, 1000000, 1000000)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	// 设置福利
	query = "INSERT INTO welfare (number, welfare, room_id) VALUES ($1, $2, $3)"
	stmt, err := tx.Prepare(query)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	for number, welfare := range p.Welfare {
		n, err := strconv.ParseFloat(number, 64)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		_, err = stmt.Exec(n, welfare, *p.ID)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
	}

	// 设置福利
	query = "INSERT INTO welfare_sender (mine_number, welfare, room_id, single) VALUES ($1, $2, $3, $4)"
	stmt, err = tx.Prepare(query)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	for number, welfare := range p.SingleMineWelfare {
		n, err := strconv.ParseInt(number, 10, 32)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		_, err = stmt.Exec(n, welfare, *p.ID, true)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
	}
	for number, welfare := range p.MultiMineWelfare {
		n, err := strconv.ParseInt(number, 10, 32)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		_, err = stmt.Exec(n, welfare, *p.ID, false)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
	}

	// 设置雷
	query = "INSERT INTO mine (parts, number, multiple, room_id) VALUES ($1, $2, $3, $4)"
	stmt, err = tx.Prepare(query)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	for i, m := range p.Mine {
		parts, err := strconv.ParseInt(i, 10, 64)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		for i, multiple := range m {
			number, err := strconv.ParseInt(i, 10, 64)
			if err != nil {
				c.Error(err).SetType(gin.ErrorTypePrivate)
				return
			}
			_, err = stmt.Exec(parts, number, multiple, *p.ID)
			if err != nil {
				c.Error(err).SetType(gin.ErrorTypePrivate)
				return
			}
		}
	}

	// 初始化房间
	room := &Room{
		id:         *p.ID,
		broadcast:  make(chan interface{}),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[int64]*Client),
		closeRobot: make(map[int64]chan bool),
	}
	go room.run()

	// 加入房间列表
	list := c.MustGet("roomList").(map[int64]*Room)
	list[*p.ID] = room

	// 事务提交
	err = tx.Commit()
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200, "data": gin.H{"id": *p.ID}})
}

func (r *Room) run() {
	for {
		select {
		case client := <-r.register:
			r.clients[client.uid] = client
		case client := <-r.unregister:
			if _, ok := r.clients[client.uid]; ok {
				delete(r.clients, client.uid)
				close(client.send)
			}
		case message := <-r.broadcast:
			for _, client := range r.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(r.clients, client.uid)
				}
			}
		}
	}
}

// enterTheRoom 进入房间
func enterTheRoom(c *gin.Context) {
	// 判断用户是否登录并获取ID
	id, err := jiemi("43jsdoij^T%fdkjf*fjdJJ2nkjs8*IOi", c.Query("key"))
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	userID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	// 准备进入房间
	roomID, err := strconv.ParseInt(c.Query("roomID"), 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	list := c.MustGet("roomList").(map[int64]*Room)

	room, ok := list[roomID]
	if !ok {
		c.Error(errors.New("the room does not exist")).SetType(gin.ErrorTypePrivate)
		return
	}

	// 初始化用户在该房间的信息
	db := c.MustGet("DB").(*sqlx.DB)
	query := "SELECT EXISTS(SELECT id FROM money WHERE room_id = $1 AND user_id = $2)"
	var exists bool
	err = db.QueryRow(query, roomID, userID).Scan(&exists)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if !exists {
		query := "INSERT INTO money (room_id, user_id, money) VALUES ($1, $2, $3)"
		_, err = db.Exec(query, roomID, userID, 0)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
	}

	serveWs(c, room, userID)
}

// listUserInRoom 获取房间的用户列表
func listUserInRoom(c *gin.Context) {
	roomID := c.Query("roomID")

	session := sessions.Default(c)
	userID, ok := session.Get("uid").(int64)
	if !ok {
		c.Error(errNotLogin).SetType(gin.ErrorTypePrivate)
		return
	}

	db := c.MustGet("DB").(*sqlx.DB)

	// 非该房间用户无法获取用户列表
	query := "SELECT EXISTS(SELECT id FROM money WHERE room_id = $1 AND user_id = $2)"
	var exists bool
	err := db.QueryRow(query, roomID, userID).Scan(&exists)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if !exists {
		if err != nil {
			c.Error(errors.New("not play in this room user cannot get user list")).SetType(gin.ErrorTypePrivate)
			return
		}
	}

	query = "SELECT a.id, a.name, b.money FROM users AS a JOIN money AS b ON a.id = b.user_id WHERE b.room_id = $1"
	rows, err := db.Queryx(query, roomID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer rows.Close()

	type User struct {
		ID     int64   `db:"id"    json:"id"`
		Name   string  `db:"name"  json:"name"`
		Money  float64 `db:"money"`
		MoneyS string  `           json:"money"`
	}

	users := []User{}
	for rows.Next() {
		var u User
		err := rows.StructScan(&u)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		u.MoneyS = strconv.FormatFloat(u.Money, 'f', 2, 64)
		users = append(users, u)
	}

	c.JSON(200, gin.H{"code": 200, "data": users})
}

// transactionInRoomWithoutCheck 房间用户之间交易豆子但不检查余额
func transactionInRoomWithoutCheck(tx *sqlx.Tx, roomID, fromUserID, toUserID int64, money float64) error {
	// 确认双方是否在该房间
	query := "SELECT EXISTS(SELECT id FROM money WHERE room_id = $1 AND user_id = $2)"
	var exists bool
	err := tx.QueryRow(query, roomID, fromUserID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("the user not play in this room")
	}
	err = tx.QueryRow(query, roomID, toUserID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("the user not play in this room")
	}

	// 扣除要交易的金额
	query = "UPDATE money SET money = money - $1 WHERE room_id = $2 AND user_id = $3"
	_, err = tx.Exec(query, money, roomID, fromUserID)
	if err != nil {
		return err
	}

	// 增加对方同样的金额
	query = "UPDATE money SET money = money + $1 WHERE room_id = $2 AND user_id = $3"
	_, err = tx.Exec(query, money, roomID, toUserID)
	return err
}

// transactionInRoom 该房间用户之间交易豆子
func transactionInRoom(c *gin.Context) {
	type Transaction struct {
		UserID int64   `json:"toUsers"`
		Money  float64 `json:"money" binding:"min=1"`
	}
	type Transactions struct {
		RoomID       int64         `json:"roomID"`
		Transactions []Transaction `json:"transactions" binding:"dive"`
	}
	var ts Transactions
	err := c.BindJSON(&ts)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	session := sessions.Default(c)
	userID, ok := session.Get("uid").(int64)
	if !ok {
		c.Error(errNotLogin).SetType(gin.ErrorTypePrivate)
		return
	}

	db := c.MustGet("DB").(*sqlx.DB)
	tx, err := db.Beginx()
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer tx.Rollback()

	// 确定余额足够
	var totalAmount float64
	for _, t := range ts.Transactions {
		totalAmount += t.Money
	}
	enough, err := haveEnoughMoney(tx, userID, ts.RoomID, totalAmount)
	if !enough {
		c.Error(errors.New("insufficient balance")).SetType(gin.ErrorTypePublic)
		return
	}

	// 开始交易
	for _, t := range ts.Transactions {
		err = transactionInRoomWithoutCheck(tx, ts.RoomID, userID, t.UserID, t.Money)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
	}

	err = tx.Commit()
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200})
}

// listRoom 房间列表
func listRoom(c *gin.Context) {
	db := c.MustGet("DB").(*sqlx.DB)

	query := "SELECT id, name, start_time + interval '1 hour' * hours AS end_time, min_parts, max_parts, min_money, max_money, ms, wbms, jq, fzqb FROM room WHERE start_time + interval '1 hour' * hours > $1"
	rows, err := db.Queryx(query, time.Now())
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer rows.Close()

	list := []roomSetting{}
	for rows.Next() {
		var rs roomSetting
		err := rows.StructScan(&rs)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}

		// 福利信息
		query := "SELECT number, welfare FROM welfare WHERE room_id = $1"
		rows, err := db.Query(query, rs.ID)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		rs.Welfare = map[string]float64{}
		for rows.Next() {
			var number, welfare float64
			err := rows.Scan(&number, &welfare)
			if err != nil {
				c.Error(err).SetType(gin.ErrorTypePrivate)
				return
			}
			rs.Welfare[strconv.FormatFloat(number, 'f', 2, 64)] = welfare
		}

		// 雷的信息
		query = "SELECT parts, number, multiple FROM mine WHERE room_id = $1"
		rows, err = db.Query(query, rs.ID)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		rs.Mine = map[string]map[string]float64{}
		for rows.Next() {
			var parts, number int
			var multiple float64
			err := rows.Scan(&parts, &number, &multiple)
			if err != nil {
				c.Error(err).SetType(gin.ErrorTypePrivate)
				return
			}
			if _, ok := rs.Mine[strconv.Itoa(parts)]; !ok {
				rs.Mine[strconv.Itoa(parts)] = map[string]float64{}
			}
			rs.Mine[strconv.Itoa(parts)][strconv.Itoa(number)] = multiple
		}
		rows.Close()

		rs.EndTime = rs.TempTime.Format("2006-01-02 15:04:05")
		list = append(list, rs)
	}

	c.JSON(200, gin.H{"code": 200, "data": list})
}

// getRoomSetting 获取房间配置信息
func getRoomSetting(c *gin.Context) {
	roomID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	type Info struct {
		Name      string                        `db:"name"       json:"name"`
		OwnerID   int64                         `db:"owner_id"   json:"ownerID"`
		OwnerName string                        `db:"owner_name" json:"ownerName"`
		MinParts  int                           `db:"min_parts"  json:"minParts"`
		MaxParts  int                           `db:"max_parts"  json:"maxParts"`
		MinMoney  float64                       `db:"min_money"  json:"minMoney"`
		MaxMoney  float64                       `db:"max_money"  json:"maxMoney"`
		Ms        bool                          `db:"ms"         json:"ms"`
		Wbms      bool                          `db:"wbms"       json:"wbms"`
		Jq        bool                          `db:"jq"         json:"jq"`
		Fzqb      bool                          `db:"fzqb"       json:"fzqb"`
		Welfare   map[string]float64            `                json:"welfare"`
		Mine      map[string]map[string]float64 `                json:"mine"`
	}

	db := c.MustGet("DB").(*sqlx.DB)
	query := "SELECT a.name, a.min_parts, a.max_parts, a.min_money, a.max_money ,a.ms, a.wbms, a.jq, a.fzqb, a.owner_id, " +
		"b.name AS owner_name " +
		"FROM room AS a JOIN users AS b ON a.owner_id = b.id WHERE a.id = $1"
	var info Info
	err = db.QueryRowx(query, roomID).StructScan(&info)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	query = "SELECT number, welfare FROM welfare WHERE room_id = $1"
	rows, err := db.Queryx(query, roomID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	welfare := map[string]float64{}
	for rows.Next() {
		var n string
		var w float64
		err := rows.Scan(&n, &w)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		welfare[n] = w
	}
	defer rows.Close()

	info.Welfare = welfare

	query = "SELECT parts ,number, multiple FROM mine WHERE room_id = $1"
	rows, err = db.Queryx(query, roomID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	mine := map[string]map[string]float64{}
	for rows.Next() {
		var p, n string
		var w float64
		err := rows.Scan(&p, &n, &w)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		if _, ok := mine[p]; !ok {
			mine[p] = map[string]float64{}
		}
		mine[p][n] = w
	}
	defer rows.Close()

	info.Mine = mine

	c.JSON(200, gin.H{"code": 200, "data": info})
}

// getRate 获取概率列表
func getRate(c *gin.Context) {
	type RoomInfo struct {
		ID   int64  `db:"id"   json:"id"`
		Name string `db:"name" json:"name"`
		Rate int    `db:"rate" json:"rate"`
	}

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

	db := c.MustGet("DB").(*sqlx.DB)
	query := "SELECT id, name, rate FROM room WHERE start_time + interval '1 hour' * hours > $1"
	rows, err := db.Queryx(query, time.Now())
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer rows.Close()

	list := []RoomInfo{}
	for rows.Next() {
		var ri RoomInfo
		err := rows.StructScan(&ri)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		list = append(list, ri)
	}

	c.JSON(200, gin.H{"code": 200, "data": list})
}

// setRate 设置概率
func setRate(c *gin.Context) {
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

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	type Data struct {
		Rate int `json:"rate"`
	}
	var d Data
	err = c.BindJSON(&d)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	db := c.MustGet("DB").(*sqlx.DB)
	query := "UPDATE room SET rate = $1 WHERE id = $2"
	_, err = db.Exec(query, d.Rate, id)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200})
}

// getCashFlow 获取当前房间的某用户现金流
func getCashFlow(c *gin.Context) {
	roomID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	session := sessions.Default(c)
	userID, ok := session.Get("uid").(int64)
	if !ok {
		c.Error(errNotLogin).SetType(gin.ErrorTypePrivate)
		return
	}

	type Record struct {
		Welfare   *float64  `db:"welfare"             json:"-"`
		WelfareI  int64     `                         json:"welfare,omitempty"`
		Mine      *string   `db:"actual_mine"         json:"mine,omitempty"`
		Message   string    `db:"red_envelop_message" json:"message"`
		DateTime  time.Time `db:"datetime"            json:"-"`
		DateTimeS string    `                         json:"time"`
		Money     float64   `db:"money"               json:"money"`
	}

	db := c.MustGet("DB").(*sqlx.DB)
	query := "SELECT money FROM money WHERE room_id = $1 AND user_id = $2"
	var money float64
	err = db.QueryRow(query, roomID, userID).Scan(&money)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	query = "SELECT a.welfare, a.actual_mine, a.red_envelop_message, a.datetime, b.money " +
		"FROM welfare_mine_log AS a " +
		"JOIN part_of_red_envelop AS b ON a.part_id = b.id " +
		"WHERE a.room_id = $1 AND a.user_id = $2"
	records := []Record{}
	rows, err := db.Queryx(query, roomID, userID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var record Record
		err = rows.StructScan(&record)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		if record.Welfare != nil {
			record.WelfareI = int64(*record.Welfare)
		}
		record.DateTimeS = record.DateTime.Format("2006-01-02 15:04:05")
		records = append(records, record)
	}

	c.JSON(200, gin.H{"code": 200, "data": gin.H{"money": money, "records": records}})
}

// roomStatistics 房间统计
func roomStatistics(c *gin.Context) {
	roomID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	session := sessions.Default(c)
	userID, ok := session.Get("uid").(int64)
	if !ok {
		c.Error(errNotLogin).SetType(gin.ErrorTypePrivate)
		return
	}

	db := c.MustGet("DB").(*sqlx.DB)
	query := "SELECT owner_id FROM room WHERE id = $1"
	var ownerID int64
	err = db.QueryRow(query, roomID).Scan(&ownerID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	if userID != ownerID {
		c.AbortWithStatus(401)
		return
	}

	var zero float64

	// 总发包金额
	query = "SELECT SUM(money) FROM red_envelop WHERE room_id = $1"
	var total *float64
	err = db.QueryRow(query, roomID).Scan(&total)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if total == nil {
		total = &zero
	}

	// 拆包奖励金额
	var unpackingAmount *float64
	query = "SELECT SUM(money) FROM part_of_red_envelop WHERE room_id = $1 AND user_id = $2"
	err = db.QueryRow(query, roomID, userID).Scan(&unpackingAmount)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if unpackingAmount == nil {
		unpackingAmount = &zero
	}

	// 中雷奖励金额
	query = "SELECT SUM(mine) FROM welfare_mine_log WHERE room_id = $1 AND owner_id = $2 AND free_type = $3"
	var mineReward *float64
	err = db.QueryRow(query, roomID, userID, 0).Scan(&mineReward)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if mineReward == nil {
		mineReward = &zero
	}

	// 福利奖励金额
	query = "SELECT SUM(welfare) FROM welfare_mine_log WHERE room_id = $1 AND user_id = $2"
	var welfareReward *float64
	err = db.QueryRow(query, roomID, userID).Scan(&welfareReward)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if welfareReward == nil {
		welfareReward = &zero
	}

	// 发包金额
	query = "SELECT SUM(money) FROM red_envelop WHERE room_id = $1 AND owner_id = $2"
	var money *float64
	err = db.QueryRow(query, roomID, userID).Scan(&money)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if money == nil {
		money = &zero
	}

	// 中雷金额
	query = "SELECT SUM(mine) FROM welfare_mine_log WHERE room_id = $1 AND user_id = $2 AND free_type = $3"
	var mine *float64
	err = db.QueryRow(query, roomID, userID, 0).Scan(&mine)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if mine == nil {
		mine = &zero
	}

	// 福利金额
	query = "SELECT SUM(welfare) FROM welfare_mine_log WHERE room_id = $1"
	var welfare *float64
	err = db.QueryRow(query, roomID).Scan(&welfare)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if welfare == nil {
		welfare = &zero
	}
	var senderWelfare *float64
	query = "SELECT SUM(welfare) FROM welfare_sender_log WHERE room_id = $1"
	err = db.QueryRow(query, roomID).Scan(&senderWelfare)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if senderWelfare == nil {
		senderWelfare = &zero
	}

	c.JSON(200, gin.H{"code": 200, "data": gin.H{"total": total, "unpackingAmount": unpackingAmount, "mineReward": mineReward, "welfareReward": welfareReward, "money": money, "mine": mine, "welfare": *welfare + *senderWelfare}})
}

// setUserRate 设置个人概率
func setUserRate(c *gin.Context) {
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

	roomID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	type User struct {
		UserID int64 `json:"userID" binding:"min=1"`
		Rate   int   `json:"rate" binding:"min=-1000,max=1000"`
	}
	type List struct {
		Users []User `json:"users"`
	}
	var list List
	err = c.BindJSON(&list)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	db := c.MustGet("DB").(*sqlx.DB)
	tx, err := db.Begin()
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer tx.Rollback()

	// 清空历史记录
	query := "DELETE FROM rate WHERE room_id = $1"
	_, err = tx.Exec(query, roomID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	// 添加新记录
	query = "INSERT INTO rate (rate, room_id, user_id) VALUES ($1, $2, $3)"
	stmt, err := tx.Prepare(query)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	for _, user := range list.Users {
		_, err = stmt.Exec(user.Rate, roomID, user.UserID)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
	}

	err = tx.Commit()
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200})
}

// getUserRate 获取个人概率
func getUserRate(c *gin.Context) {
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

	roomID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	type User struct {
		UserID int64 `db:"user_id" json:"userID"`
		Rate   int   `db:"rate"    json:"rate"`
	}
	list := []User{}

	db := c.MustGet("DB").(*sqlx.DB)
	query := "SELECT user_id, rate FROM rate WHERE room_id = $1"
	rows, err := db.Queryx(query, roomID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var u User
		err = rows.StructScan(&u)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		list = append(list, u)
	}

	c.JSON(200, gin.H{"code": 200, "data": list})
}
