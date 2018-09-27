package main

import (
	"encoding/json"
	"github.com/jmoiron/sqlx"
	"log"
	"strconv"
)

// Messages 请求的基础消息体
type Messages struct {
	Type string          `json:"type"`
	ID   int64           `json:"id"`
	Body json.RawMessage `json:"body"`
}

// ResponseBase 应答的基础消息体
type ResponseBase struct {
	Type string `json:"type"`
	ID   int64  `json:"id,omitempty"`
}

// ReceiveRedEnvelop 拆开的红包
type ReceiveRedEnvelop struct {
	ResponseBase
	Money        string `json:"money"`
	RedEnvelopID int64  `json:"redEnvelopID,omitempty"`
	UserID       int64  `json:"userID,omitempty"`
	UserName     string `json:"userName,omitempty"`
	DateTime     string `json:"dateTime,omitempty"`
}

// RedEnvelopDescription 红包的基本信息
type RedEnvelopDescription struct {
	Type      string `json:"type"`
	ID        int64  `json:"id"`
	OwnerID   int64  `json:"ownerID"`
	OwnerName string `json:"ownerName"`
	Number    int    `json:"number"`
	Money     string `json:"money"`
	Message   string `json:"message"`
}

// messageTrigger 根据消息体触发相应的动作
func messageTrigger(c *Client, db *sqlx.DB, msg Messages) error {
	// 聊天消息
	type Message struct {
		Type     string `json:"type"`
		UserID   int64  `json:"userID"`
		UserName string `json:"userName"`
		Message  string `json:"message"`
	}
	// 发来的红包
	type SendRedEnvelop struct {
		Money   float64 `json:"money"`
		Number  int     `json:"number"`
		Mine    string  `json:"mine"`
		Message string  `json:"message"`
	}
	// 要拆的红包
	type OpenRedEnvelop struct {
		RedEnvelopID int64 `json:"redEnvelopID"`
	}
	// 应答消息体
	type Response struct {
		ResponseBase
		Code    int64  `json:"code,omitempty"`
		Message string `json:"message,omitempty"`
	}

	switch msg.Type {
	case "sendMessage":
		var message Message
		if err := json.Unmarshal([]byte(msg.Body), &message); err != nil {
			return err
		}
		message.Type = "message"
		c.send <- Response{ResponseBase: ResponseBase{Type: "response", ID: msg.ID}, Code: 200}
		c.room.broadcast <- message
	case "sendRedEnvelop":
		var sre SendRedEnvelop
		if err := json.Unmarshal([]byte(msg.Body), &sre); err != nil {
			return err
		}
		if sre.Money < 0 { // 检查money字段是否为负数
			sre.Money = -sre.Money
		}
		id, err := createRedEnvelop(db, c.uid, sre.Money, sre.Number, sre.Mine, sre.Message, c.room.id)
		if err != nil {
			c.send <- Response{ResponseBase: ResponseBase{Type: "response", ID: msg.ID}, Code: 400, Message: err.Error()}
			return err
		}

		c.send <- Response{ResponseBase: ResponseBase{Type: "response", ID: msg.ID}, Code: 200}
		name, _ := getUserName(db, c.uid)
		c.room.broadcast <- RedEnvelopDescription{Type: "redEnvelop", ID: id, OwnerID: c.uid, OwnerName: name, Number: sre.Number, Money: strconv.FormatFloat(sre.Money, 'f', 2, 64), Message: sre.Message}
		err = callRobot(c.room, db, id)
		if err != nil {
			log.Println(err)
		}
	case "grabRedEnvelop":
		var ore OpenRedEnvelop
		if err := json.Unmarshal([]byte(msg.Body), &ore); err != nil {
			return err
		}
		money, userName, remainder, now, err := openRedEnvelop(db, c.room.id, c.uid, ore.RedEnvelopID)
		if err != nil {
			c.send <- Response{ResponseBase: ResponseBase{Type: "response", ID: msg.ID}, Code: 400, Message: err.Error()}
			return err
		}
		c.send <- ReceiveRedEnvelop{ResponseBase: ResponseBase{Type: "redEnvelopMoney", ID: msg.ID}, Money: money}
		c.room.broadcast <- ReceiveRedEnvelop{ResponseBase: ResponseBase{Type: "redEnvelopRecord"}, Money: money, RedEnvelopID: ore.RedEnvelopID, UserID: c.uid, UserName: userName, DateTime: now.Format("2006-01-02 15:04:05")}
		// 广播统计信息
		if remainder == 1 {
			s, err := openAndCheck(db, c.room.id, ore.RedEnvelopID)
			if err != nil {
				log.Println(err)
			}
			c.room.broadcast <- s
		}
	}

	return nil
}
