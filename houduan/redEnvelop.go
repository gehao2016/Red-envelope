package main

import (
	"crypto/rand"
	"database/sql"
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"math/big"
	"strconv"
	"time"
)

var (
	errEmpty = errors.New("抢光了")
)

// 拆包记录
type partInfo struct {
	ID       int64   `db:"id"                  json:"id"`
	Money    float64 `db:"money"               json:"-"`
	MoneyS   string  `                         json:"money"`
	UserID   *int64  `db:"user_id"             json:"userID"`
	DateTime string  `db:"date_time,omitempty" json:"dateTime,omitempty"`
}

// 拆包信息
type partAllInfo struct {
	partInfo
	UserName   string   `db:"name"        json:"userName"`
	Welfare    *float64 `db:"welfare"     json:"-"`
	WelfareS   string   `                 json:"welfare,omitempty"`
	ActualMine *string  `db:"actual_mine" json:"mine,omitempty"`
}

// 统计信息
type statistics struct {
	Type              string               `json:"type"`
	RedEnvelopID      int64                `json:"redEnvelopID"`
	RedEnvelopWelfare []statisticsBaseInfo `json:"redEnvelopWelfare"`
	RedEnvelopMine    []statisticsBaseInfo `json:"redEnvelopMine"`
	SenderWelfare     *statisticsBaseInfo  `json:"senderWelfare"`
}
type statisticsBaseInfo struct {
	UserID   int64  `json:"userID"`
	UserName string `json:"userName"`
	Money    string `json:"money"`
}

// createRedEnvelop 生成新红包
func createRedEnvelop(db *sqlx.DB, ownerID int64, money float64, number int, mine, message string, roomID int64) (int64, error) {
	moneyInt := int64(money * 100)
	if moneyInt < int64(number) {
		return 0, errors.New("money less than number")
	}

	tx, err := db.Beginx()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// 判断余额是否充足
	enough, err := haveEnoughMoney(tx, ownerID, roomID, money)
	if !enough {
		return 0, errors.New("余额不足，请联系房主领豆")
	}

	// 取出账户里的钱
	query := "UPDATE money SET money = money - $1 WHERE user_id = $2 AND room_id = $3"
	_, err = tx.Exec(query, money, ownerID, roomID)
	if err != nil {
		return 0, err
	}

	// 存钱进红包
	query = "INSERT INTO red_envelop (money, number, mine, message, owner_id, room_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"
	var id int64
	err = tx.QueryRow(query, money, number, mine, message, ownerID, roomID).Scan(&id)
	if err != nil {
		return 0, err
	}

	// 获取个人中雷微调概率
	var rate int
	query = "select rate FROM rate WHERE room_id = $1 AND user_id = $2"
	err = tx.QueryRow(query, roomID, ownerID).Scan(&rate)
	if err == sql.ErrNoRows {
		// 获取房间中雷微调概率
		query = "select rate FROM room WHERE id = $1"
		err = tx.QueryRow(query, roomID).Scan(&rate)
		if err != nil {
			return 0, err
		}
	} else if err != nil {
		return 0, err
	}

	// 生成踩雷条件
	mines := map[int]bool{}
	for _, m := range mine {
		mines[int(m-'0')] = false
	}

	query = "INSERT INTO part_of_red_envelop (red_envelop_id, money, room_id) VALUES ($1, $2, $3)"
	result, err := injectionRate(rate, moneyInt-int64(number), number, mines)
	for _, n := range result {
		_, err = tx.Exec(query, id, float64(n)/100, roomID)
		if err != nil {
			return 0, err
		}
	}

	err = tx.Commit()
	if err != nil {
		return 0, err
	}

	return id, err
}

// openRedEnvelop 拆红包
func openRedEnvelop(db *sqlx.DB, roomID, userID, redEnvelopID int64) (string, string, int, time.Time, error) {
	now := time.Now()

	tx, err := db.Beginx()
	if err != nil {
		return "0", "", 0, now, err
	}
	defer tx.Rollback()

	// 是否只能房主抢包
	query := "SELECT a.jq, a.fzqb, a.owner_id FROM room AS a JOIN red_envelop AS b ON a.id = b.room_id WHERE b.id = $1"
	var jq, fzqb bool
	var roomOwnerID int64
	err = tx.QueryRow(query, redEnvelopID).Scan(&jq, &fzqb, &roomOwnerID)
	if err != nil {
		return "0", "", 0, now, err
	}

	if jq && userID != roomOwnerID {
		return "0", "", 0, now, errors.New("只能房主清包")
	}

	// 判断是否有足够的余额保证能赔付该红包
	var money float64
	var number int
	var mine string
	query = "SELECT money, number, mine FROM red_envelop WHERE id = $1"
	err = tx.QueryRow(query, redEnvelopID).Scan(&money, &number, &mine)
	if err != nil {
		return "0", "", 0, now, err
	}
	query = "SELECT multiple FROM mine WHERE room_id = $1 AND parts = $2 AND number = $3"
	var multiple float64
	err = tx.QueryRow(query, roomID, number, len(mine)).Scan(&multiple)
	if err != nil && err != sql.ErrNoRows {
		return "0", "", 0, now, err
	}
	enough, err := haveEnoughMoney(tx, userID, roomID, money*multiple)
	if err != nil {
		return "0", "", 0, now, err
	}
	if !enough {
		return "0", "", 0, now, errors.New("余额不足，请联系房主领豆")
	}

	// 获取红包的分包列表
	query = "SELECT id, money, user_id FROM part_of_red_envelop WHERE red_envelop_id = $1"
	rows, err := tx.Queryx(query, redEnvelopID)
	if err != nil {
		return "0", "", 0, now, err
	}
	defer rows.Close()

	var parts []partInfo
	for rows.Next() {
		var p partInfo
		err := rows.StructScan(&p)
		if err != nil {
			return "0", "", 0, now, err
		}
		if p.UserID == nil { // 判断该分包是否被抢过
			parts = append(parts, p)
			continue
		}
		if !jq && *p.UserID == userID { // 假装红包已抢完，会触发显示红包详情的逻辑
			if !(fzqb && userID == roomOwnerID) { // 如果开启了房主清包则允许房主继续抢
				return "0", "", 0, now, errEmpty
			}
		}
	}

	// 剩余的包数
	remainder := len(parts)
	if remainder == 0 {
		return "0", "", remainder, now, errEmpty
	}

	// 获取总的包数
	query = "SELECT number FROM red_envelop WHERE id = $1 AND room_id = $2"
	err = tx.QueryRow(query, redEnvelopID, roomID).Scan(&number)
	if err != nil {
		return "0", "", remainder, now, err
	}

	var p partInfo

	// 增加首包的手气
	if remainder == number {
		for i := 1; i <= 3; i++ {
			partID, err := rand.Int(rand.Reader, big.NewInt(int64(remainder)))
			if err != nil {
				return "0", "", remainder, now, err
			}
			if parts[partID.Int64()].Money > p.Money {
				p.Money = parts[partID.Int64()].Money
				p.ID = parts[partID.Int64()].ID
			}
		}
	}

	// 增加尾包的手气
	if remainder <= (number / 2) {
		partID, err := rand.Int(rand.Reader, big.NewInt(int64(len(parts))))
		if err != nil {
			return "0", "", 0, now, err
		}
		p.Money = parts[partID.Int64()].Money
		p.ID = parts[partID.Int64()].ID

		for i := 1; i <= 2; i++ {
			partID, err := rand.Int(rand.Reader, big.NewInt(int64(len(parts))))
			if err != nil {
				return "0", "", remainder, now, err
			}
			if parts[partID.Int64()].Money < p.Money {
				p.Money = parts[partID.Int64()].Money
				p.ID = parts[partID.Int64()].ID
			}
		}
	} else {
		// 剩下随机选择
		partID, err := rand.Int(rand.Reader, big.NewInt(int64(remainder)))
		if err != nil {
			return "0", "", remainder, now, err
		}
		p.Money = parts[partID.Int64()].Money
		p.ID = parts[partID.Int64()].ID
	}

	// 拆包
	query = "UPDATE part_of_red_envelop SET user_id = $1, date_time = $2 WHERE id = $3"
	_, err = tx.Exec(query, userID, now, p.ID)
	if err != nil {
		return "0", "", remainder, now, err
	}
	// 存入账户
	query = "UPDATE money SET money = money + $1 WHERE user_id = $2 AND room_id = $3"
	_, err = tx.Exec(query, p.Money, userID, roomID)
	if err != nil {
		return "0", "", remainder, now, err
	}

	var userName string
	query = "SELECT name FROM users WHERE id = $1"
	err = tx.QueryRow(query, userID).Scan(&userName)

	err = tx.Commit()
	if err != nil {
		return "0", "", remainder, now, err
	}

	p.MoneyS = strconv.FormatFloat(p.Money, 'f', 2, 64)
	return p.MoneyS, userName, remainder, now, nil
}

// openAndCheck 计算输赢
func openAndCheck(db *sqlx.DB, roomID, redEnvelopID int64) (statistics, error) {
	var s statistics

	// 准备相关变量
	welfare, err := getWelfareConditions(db, roomID)
	if err != nil {
		return s, err
	}
	mines, err := getMines(db, redEnvelopID)
	if err != nil {
		return s, err
	}
	var n int
	query := "SELECT number FROM red_envelop WHERE id = $1"
	err = db.QueryRow(query, redEnvelopID).Scan(&n)
	if err != nil {
		return s, err
	}
	multiple, err := getMineInfo(db, roomID, n, len(mines))
	if err != nil {
		return s, err
	}
	mantissa := map[int]bool{}

	tx, err := db.Beginx()
	if err != nil {
		return s, err
	}
	defer tx.Rollback()

	// 设置红包状态为抢光
	query = "UPDATE red_envelop SET is_empty = $1 WHERE id = $2"
	_, err = tx.Exec(query, true, redEnvelopID)
	if err != nil {
		return s, err
	}

	// 获取房主、包主的ID、免死、尾巴免死和禁抢
	query = "SELECT a.message, a.owner_id, b.owner_id, b.ms, b.wbms, b.jq FROM red_envelop AS a JOIN room AS b ON a.room_id = b.id WHERE a.id = $1"
	var message string
	var roomOwnerID, ownerID int64
	var ms, wbms, jq bool
	err = tx.QueryRow(query, redEnvelopID).Scan(&message, &ownerID, &roomOwnerID, &ms, &wbms, &jq)
	if err != nil {
		return s, err
	}

	query = "SELECT a.id, a.money, a.user_id, b.name FROM part_of_red_envelop AS a JOIN users AS b ON a.user_id = b.id WHERE red_envelop_id = $1 ORDER BY a.date_time ASC"
	rows, err := tx.Queryx(query, redEnvelopID)
	if err != nil {
		return s, err
	}
	defer rows.Close()

	// 拆包记录
	type part struct {
		ID       int64   `db:"id"`
		UserID   *int64  `db:"user_id"`
		UserName string  `db:"name"`
		Money    float64 `db:"money"`
	}
	parts := []part{}
	welfareParts := []part{}

	var realMinePart int // 真实中雷的包
	var fzsbID int64     // 房主首包ID
	var wbmsID int64     // 尾巴ID
	for rows.Next() {
		var p part
		err := rows.StructScan(&p)
		if err != nil {
			return s, err
		}
		if p.UserID == nil {
			return s, errors.New("红包未拆完")
		}
		// 记录福利包
		if _, ok := welfare[p.Money]; ok {
			welfareParts = append(welfareParts, p)
		}
		// 记录尾数
		n := int(p.Money*100+0.1) % 10 // +0.1是因为浮点数
		mantissa[n] = true
		// 登记中雷包
		if mines[n] {
			parts = append(parts, p)
		}
		// 确定房主首包ID
		if *p.UserID == roomOwnerID && fzsbID == 0 {
			fzsbID = p.ID
		}
		// 确定尾巴ID
		wbmsID = p.ID
	}

	// 送福利
	for _, p := range welfareParts {
		w := welfare[p.Money]
		err := transactionInRoomWithoutCheck(tx, roomID, roomOwnerID, *p.UserID, w)
		if err != nil {
			return s, err
		}
		// 保存福利记录
		query := "INSERT INTO welfare_mine_log (part_id, welfare, red_envelop_message, datetime, room_id, user_id, owner_id) " +
			"VALUES ($1, $2, $3, $4, $5, $6, $7)"
		_, err = tx.Exec(query, p.ID, w, message, time.Now(), roomID, p.UserID, ownerID)
		if err != nil {
			return s, err
		}
		// 广播福利信息
		s.RedEnvelopWelfare = append(s.RedEnvelopWelfare, statisticsBaseInfo{UserID: *p.UserID, UserName: p.UserName, Money: strconv.FormatFloat(w, 'f', 2, 64)})
	}

	// 确定是否全部踩雷
	allIn := true
	for m := range mines {
		if !mantissa[m] { // 如果不包含该尾数
			allIn = false
		}
	}
	// 倍数值为零则放弃踩雷计算
	if multiple == 0 {
		allIn = false
	}
	if allIn {
		var money float64
		query := "SELECT money FROM red_envelop WHERE id = $1"
		err := tx.QueryRow(query, redEnvelopID).Scan(&money)
		if err != nil {
			return s, err
		}
		// 准备保存踩雷记录
		query = "INSERT INTO welfare_mine_log " +
			"(part_id, mine, free_type, actual_mine, red_envelop_message, datetime, room_id, user_id, owner_id) " +
			"VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) " +
			"ON CONFLICT (part_id) DO " +
			"UPDATE SET mine = $2, free_type = $3, actual_mine = $4, red_envelop_message = $5, datetime = $6, room_id = $7, user_id = $8, owner_id = $9"
		stmt, err := tx.Prepare(query)
		if err != nil {
			return s, err
		}
		msOnce := true // 免死一次
		for _, part := range parts {
			if jq && ms { // 禁抢与免死同时打开时，免死功能只能作用在每个红包的第一包上，尾巴免死失效
				if fzsbID == part.ID {
					_, err := stmt.Exec(part.ID, multiple*money, 1, "禁抢免死", message, time.Now(), roomID, part.UserID, ownerID)
					if err != nil {
						return s, err
					}
					continue
				}
			} else {
				if wbms && wbmsID == part.ID { // 尾巴免死
					_, err := stmt.Exec(part.ID, multiple*money, 2, "尾巴免死", message, time.Now(), roomID, part.UserID, ownerID)
					if err != nil {
						return s, err
					}
					continue
				}
				if ms && msOnce && fzsbID == part.ID { // 房主免死
					_, err := stmt.Exec(part.ID, multiple*money, 3, "房主免死", message, time.Now(), roomID, part.UserID, ownerID)
					if err != nil {
						return s, err
					}
					msOnce = false
					continue
				}
			}
			err := transactionInRoomWithoutCheck(tx, roomID, *part.UserID, ownerID, multiple*money)
			if err != nil {
				return s, err
			}
			_, err = stmt.Exec(part.ID, multiple*money, 0, strconv.FormatFloat(multiple*money, 'f', 2, 64), message, time.Now(), roomID, part.UserID, ownerID)
			if err != nil {
				return s, err
			}
			realMinePart++
			s.RedEnvelopMine = append(s.RedEnvelopMine, statisticsBaseInfo{UserID: *part.UserID, UserName: part.UserName, Money: strconv.FormatFloat(multiple*money, 'f', 2, 64)})
		}

		// 中雷奖励流程
		var welareSenderID int64
		var mineWelfare float64
		query = "SELECT id, welfare FROM welfare_sender WHERE room_id = $1 AND mine_number = $2 AND single = $3"
		err = tx.QueryRow(query, roomID, realMinePart, len(mines) == 1).Scan(&welareSenderID, &mineWelfare)
		if err == sql.ErrNoRows {

		} else if err != nil {
			return s, err
		} else {
			err = transactionInRoomWithoutCheck(tx, roomID, roomOwnerID, ownerID, mineWelfare)
			if err != nil {
				return s, err
			}
			query = "INSERT INTO welfare_sender_log (room_id, red_envelop_id, welfare, owner_id, welfare_sender_id) VALUES ($1, $2, $3, $4, $5)"
			_, err = tx.Exec(query, roomID, redEnvelopID, mineWelfare, ownerID, welareSenderID)
			if err != nil {
				return s, err
			}
			query = "SELECT name FROM users WHERE id = $1"
			var ownerName string
			err = tx.QueryRow(query, ownerID).Scan(&ownerName)
			if err != nil {
				return s, err
			}
			s.SenderWelfare = &statisticsBaseInfo{UserID: ownerID, UserName: ownerName, Money: strconv.FormatFloat(mineWelfare, 'f', 2, 64)}
		}
	}

	err = tx.Commit()
	if err != nil {
		return s, err
	}

	s.Type = "redEnvelopInfo"
	s.RedEnvelopID = redEnvelopID

	return s, nil
}

// redEnvelopInfo 获取红包的拆包信息
func redEnvelopInfo(db *sqlx.DB, redEnvelopID int64) ([]partAllInfo, error) {
	info := []partAllInfo{}

	query := "SELECT a.id, a.money, a.user_id, to_char(date_time, 'YYYY-MM-DD HH24:MI:SS') as date_time, " +
		"b.name, " +
		"c.welfare, c.actual_mine " +
		"FROM part_of_red_envelop AS a " +
		"JOIN users AS b ON a.user_id = b.id " +
		"LEFT JOIN welfare_mine_log AS c ON a.id = c.part_id " +
		"WHERE red_envelop_id = $1 ORDER BY a.date_time DESC"
	rows, err := db.Queryx(query, redEnvelopID)
	if err != nil {
		return info, err
	}
	defer rows.Close()

	for rows.Next() {
		var i partAllInfo
		err := rows.StructScan(&i)
		if err != nil {
			return info, err
		}
		i.MoneyS = strconv.FormatFloat(i.Money, 'f', 2, 64)
		if i.Welfare != nil {
			i.WelfareS = strconv.FormatFloat(*i.Welfare, 'f', 2, 64)
		}
		info = append(info, i)
	}

	return info, nil
}

// getRedEnvelopInfo 获取红包的拆包信息
func getRedEnvelopInfo(c *gin.Context) {
	redEnvelopID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	db := c.MustGet("DB").(*sqlx.DB)

	list, err := redEnvelopInfo(db, redEnvelopID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	c.JSON(200, gin.H{"code": 200, "data": gin.H{"ID": redEnvelopID, "Parts": list}})
}

// haveEnoughMoney 预判最差情况下能否消费该笔费用
func haveEnoughMoney(tx *sqlx.Tx, userID, roomID int64, money float64) (bool, error) {
	// 获取余额
	query := "SELECT money FROM money WHERE user_id = $1 AND room_id = $2"
	var over float64
	err := tx.QueryRow(query, userID, roomID).Scan(&over)
	if err != nil {
		return false, err
	}

	// 最差情况下要赔付的金额
	query = "SELECT parts, number, multiple FROM mine WHERE room_id = $1"
	multiple := map[int]map[int]float64{}
	rows, err := tx.Query(query, roomID)
	if err != nil {
		return false, err
	}
	defer rows.Close()

	for rows.Next() {
		var p, n int
		var m float64
		err := rows.Scan(&p, &n, &m)
		if err != nil {
			return false, err
		}
		if multiple[p] == nil {
			nmap := map[int]float64{n: m}
			multiple[p] = nmap
		} else {
			multiple[p][n] = m
		}
	}

	query = "SELECT a.money, a.number, a.mine " +
		"FROM red_envelop AS a JOIN part_of_red_envelop AS b ON a.id = b.red_envelop_id " +
		"WHERE b.user_id = $1 AND a.room_id = $2 AND a.is_empty = $3"
	rows, err = tx.Query(query, userID, roomID, false)
	if err != nil {
		return false, err
	}
	defer rows.Close()

	var cost float64
	for rows.Next() {
		var money float64
		var number int
		var mine string
		err := rows.Scan(&money, &number, &mine)
		if err != nil {
			return false, err
		}
		cost += multiple[number][len(mine)] * money
	}

	// 再次检查money是否为负数
	if money < 0 {
		money = -money
	}

	// 余额不足
	if over-cost-money < 0 {
		return false, nil
	}

	// 余额足够
	return true, nil
}

// listRedEnvelops 获取当前房间的所有红包
func listRedEnvelops(c *gin.Context) {
	type redEnvelop struct {
		ID        int64         `db:"id"       json:"id"`
		OwnerID   int64         `db:"owner_id" json:"ownerID"`
		OwnerName string        `db:"name"     json:"ownerName"`
		Number    int           `db:"number"   json:"number"`
		Message   string        `db:"message"  json:"message"`
		Parts     []partAllInfo `json:"parts"`
	}

	roomID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	db := c.MustGet("DB").(*sqlx.DB)
	query := "SELECT a.id, a.owner_id, b.name, a.number, a.message " +
		"FROM red_envelop AS a JOIN users AS b ON a.owner_id = b.id " +
		"WHERE a.room_id = $1 ORDER BY a.id ASC"
	rows, err := db.Queryx(query, roomID)
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}
	defer rows.Close()

	var res []redEnvelop
	for rows.Next() {
		var re redEnvelop
		err := rows.StructScan(&re)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		re.Parts, err = redEnvelopInfo(db, re.ID)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		res = append(res, re)
	}

	c.JSON(200, gin.H{"code": 200, "data": res})
}
