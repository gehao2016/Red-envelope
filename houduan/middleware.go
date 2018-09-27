package main

import (
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"log"
	"time"
)

// database 数据库中间件
func database(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("DB", db)
		c.Next()
	}
}

// roomList 初始化房间列表
func roomList(db *sqlx.DB) gin.HandlerFunc {
	list := map[int64]*Room{}

	query := "SELECT id FROM room WHERE start_time + interval '1 hour' * hours > $1"
	rows, err := db.Query(query, time.Now())
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int64
		err := rows.Scan(&id)
		if err != nil {
			log.Fatal(err)
		}

		// 初始化房间
		room := &Room{
			id:         id,
			broadcast:  make(chan interface{}),
			register:   make(chan *Client),
			unregister: make(chan *Client),
			clients:    make(map[int64]*Client),
			closeRobot: make(map[int64]chan bool),
		}
		go room.run()

		// 加入房间列表
		list[id] = room
	}

	return func(c *gin.Context) {
		c.Set("roomList", list)
		c.Next()
	}
}

// configInfo 配置信息
func configInfo(config configuration) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("config", config)
		c.Next()
	}
}

// weixin 微信公众号票据信息
func weixinInfo(config configuration) gin.HandlerFunc {
	// 首次更新公众号票据
	wx, err := updateToken(config)
	if err != nil {
		log.Fatalf("update token: %v\n", err)
	}
	// 然后自动更新票据
	var ticker = time.Tick(2*time.Hour - 1*time.Minute) //更新间隔默认两个小时，提前1分钟开始更新
	go func() {
		for range ticker {
			wx, _ = updateToken(config) //*错误需处理*
		}
	}()
	return func(c *gin.Context) {
		c.Set("weixin", wx)
		c.Next()
	}
}
