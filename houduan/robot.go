package main

import (
	"database/sql"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"log"
	"math/rand"
	"sort"
	"strconv"
	"time"
)

// callRobot 召唤机器人
func callRobot(room *Room, db *sqlx.DB, redEnvelopID int64) error {
	// 获取房间配置信息
	query := "SELECT jq, fzqb FROM room WHERE id = $1"
	var jq, fzqb bool
	err := db.QueryRow(query, room.id).Scan(&jq, &fzqb)
	if err != nil {
		return err
	}

	// 禁抢开启后，房主自动清包
	if jq {
		err = clearTheRemainingParts(room, db, redEnvelopID)
		if err != nil {
			return err
		}
	} else { // 否则启动房间内用户设置的机器人
		query = "SELECT user_id, second FROM robot WHERE room_id = $1 AND is_using = $2 ORDER BY second"
		rows, err := db.Queryx(query, room.id, true)
		if err != nil {
			return err
		}
		defer rows.Close()

		setting := map[float64][]int64{} // 设置相同时间的用户列表
		for rows.Next() {
			var userID int64
			var second float64
			err = rows.Scan(&userID, &second)
			if err != nil {
				return err
			}
			if _, ok := setting[second]; !ok {
				setting[second] = []int64{} // 初始化空数组
			}
			setting[second] = append(setting[second], userID)
		}

		// 指定时间开始拆红包
		for second, users := range setting {
			go func(n float64, users []int64) {
				t := time.NewTimer(time.Duration(n) * time.Second)
				<-t.C
				err := randomlySelect(db, room, users, redEnvelopID)
				if err != nil {
					log.Println(err, users)
				}
			}(second, users)
		}

	}

	// 房主清包开启后，三十秒执行清包任务
	if fzqb {
		go func() {
			t := time.NewTimer(30 * time.Second)
			<-t.C
			err := clearTheRemainingParts(room, db, redEnvelopID)
			if err != nil {
				log.Println(err)
			}
		}()
	}

	return nil
}

// clearTheRemainingParts 房主清包
func clearTheRemainingParts(room *Room, db *sqlx.DB, redEnvelopID int64) error {
	// 获取房主ID
	query := "SELECT owner_id FROM room WHERE id = $1"
	var OwnerID int64
	err := db.QueryRow(query, room.id).Scan(&OwnerID)
	if err != nil {
		return err
	}

	// 获取剩余包数
	query = "SELECT COUNT(*) FROM part_of_red_envelop WHERE red_envelop_id = $1 AND user_id IS NULL"
	var number int
	err = db.QueryRow(query, redEnvelopID).Scan(&number)
	if err != nil {
		return err
	}

	// 房主清理剩余的包
	for i := 0; i < number; i++ {
		money, userName, remainder, now, err := openRedEnvelop(db, room.id, OwnerID, redEnvelopID)
		if err != nil { // 忽略出错的包
			continue
		}
		if c, ok := room.clients[OwnerID]; ok { // 如果房主在线，返回清包信息
			c.send <- ReceiveRedEnvelop{ResponseBase: ResponseBase{Type: "redEnvelopMoney"}, Money: money}
		}
		room.broadcast <- ReceiveRedEnvelop{ResponseBase: ResponseBase{Type: "redEnvelopRecord"}, Money: money, RedEnvelopID: redEnvelopID, UserID: OwnerID, UserName: userName, DateTime: now.Format("2006-01-02 15:04:05")} // 广播清包信息

		// 广播统计信息
		if remainder == 1 {
			s, err := openAndCheck(db, room.id, redEnvelopID)
			if err != nil {
				return err
			}
			room.broadcast <- s
		}
	}

	return nil
}

// setRobot 设置机器人自动抢红包
func setRobot(c *gin.Context) {
	type Setting struct {
		RoomID  int64   `json:"roomID"`
		IsUsing bool    `json:"isUsing"`
		Second  float64 `json:"second"`
	}
	var s Setting
	err := c.BindJSON(&s)
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
	tx, err := db.Begin()
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer tx.Rollback()

	query := "SELECT EXISTS(SELECT id FROM robot WHERE room_id = $1 AND user_id = $2)"
	var exists bool
	err = tx.QueryRow(query, s.RoomID, userID).Scan(&exists)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	if exists {
		query = "UPDATE robot SET second = $3, is_using = $4 WHERE room_id = $1 AND user_id = $2"
	} else {
		query = "INSERT INTO robot (room_id, user_id, second, is_using) VALUES ($1, $2, $3, $4)"
	}
	_, err = tx.Exec(query, s.RoomID, userID, s.Second, s.IsUsing)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	err = tx.Commit()
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200})
}

// getRobotSetting 获取机器人设置
func getRobotSetting(c *gin.Context) {
	roomID, err := strconv.ParseInt(c.Query("roomID"), 10, 64)
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
	query := "SELECT second, is_using FROM robot WHERE room_id = $1 AND user_id = $2"
	var second float64
	var isUsing bool
	err = db.QueryRow(query, roomID, userID).Scan(&second, &isUsing)
	if err != nil && err != sql.ErrNoRows {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200, "data": gin.H{"second": second, "isUsing": isUsing}})
}

// randomlySelect 随机选择设置用户，代抢红包
func randomlySelect(db *sqlx.DB, room *Room, users []int64, redEnvelopID int64) error {
	r := rand.New(rand.NewSource(time.Now().Unix()))
	perm := r.Perm(len(users)) // 乱序数组下标
	for _, i := range perm {
		money, userName, remainder, now, err := openRedEnvelop(db, room.id, users[i], redEnvelopID)
		if err != nil { // 忽略出错的包
			continue
		}
		if c, ok := room.clients[users[i]]; ok { // 如果用户在线，返回代抢信息
			c.send <- ReceiveRedEnvelop{ResponseBase: ResponseBase{Type: "redEnvelopMoney"}, Money: money}
		}
		room.broadcast <- ReceiveRedEnvelop{ResponseBase: ResponseBase{Type: "redEnvelopRecord"}, Money: money, RedEnvelopID: redEnvelopID, UserID: users[i], UserName: userName, DateTime: now.Format("2006-01-02 15:04:05")} // 广播清包信息

		// 广播统计信息
		if remainder == 1 {
			s, err := openAndCheck(db, room.id, redEnvelopID)
			if err != nil {
				return err
			}
			room.broadcast <- s
		}
	}
	return nil
}

// autoCreateRedEnvelop 自动发红包
func autoCreateRedEnvelop(c *gin.Context) {
	type RedEnvelop struct {
		RoomID    int64 `json:"roomID"    binding:"min=1"`
		MinTime   int   `json:"minTime"   binding:"min=1"`
		MaxTime   int   `json:"maxTime"   binding:"gtefield=MinTime"`
		MinMoney  int   `json:"minMoney"  binding:"min=10"`
		MaxMoney  int   `json:"maxMoney"  binding:"gtefield=MinMoney"`
		MinNumber int   `json:"minNumber" binding:"min=5"`
		MaxNumber int   `json:"maxNumber" binding:"gtefield=MinNumber"`
		MinMine   int   `json:"minMine"   binding:"min=1"`
		MaxMine   int   `json:"maxMine"   binding:"max=10"`
	}
	var re RedEnvelop
	err := c.BindJSON(&re)
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

	rooms := c.MustGet("roomList").(map[int64]*Room)

	// 增加关闭自动发包功能的channel
	if room, ok := rooms[re.RoomID]; ok {
		room.closeRobot[userID] = make(chan bool)
	}

	go func() {
		for {
			// 准备随机数据
			r := rand.New(rand.NewSource(time.Now().Unix()))
			randTime := r.Intn(re.MaxTime-re.MinTime+1) + re.MinTime
			randNumber := r.Intn(re.MaxNumber-re.MinNumber+1) + re.MinNumber
			minMoney := re.MinMoney / 10
			maxMoney := re.MaxMoney / 10
			randMoney := (r.Intn(maxMoney-minMoney+1) + minMoney) * 10
			var randMine string
			perm := r.Perm(10) // 乱序数组下标
			randMineNumber := r.Intn(re.MaxMine-re.MinMine+1) + re.MinMine
			mine := perm[:randMineNumber]
			sort.Ints(mine)
			for _, m := range mine {
				randMine += strconv.Itoa(m)
			}

			time.Sleep(time.Duration(randTime) * time.Second)
			select {
			case <-rooms[re.RoomID].closeRobot[userID]:
				return
			default:
				id, err := createRedEnvelop(db, userID, float64(randMoney), randNumber, randMine, strconv.Itoa(randMoney)+"/"+randMine, re.RoomID)
				if err != nil {
					log.Println(err)
					continue
				}

				name, _ := getUserName(db, userID)
				rooms[re.RoomID].broadcast <- RedEnvelopDescription{Type: "redEnvelop", ID: id, OwnerID: userID, OwnerName: name, Number: randNumber, Money: strconv.FormatFloat(float64(randMoney), 'f', 2, 64), Message: strconv.Itoa(randMoney) + "/" + randMine}
				err = callRobot(rooms[re.RoomID], db, id)
				if err != nil {
					log.Println(err)
				}
			}
		}
	}()

	c.JSON(200, gin.H{"code": 200})
}

// stopAutoCreateRedEnvelop 停止自动发包
func stopAutoCreateRedEnvelop(c *gin.Context) {
	type RedEnvelop struct {
		RoomID int64 `json:"roomID"`
	}
	var re RedEnvelop
	err := c.BindJSON(&re)
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

	rooms := c.MustGet("roomList").(map[int64]*Room)

	if close, ok := rooms[re.RoomID].closeRobot[userID]; ok {
		close <- true
	}

	c.JSON(200, gin.H{"code": 200})
}
