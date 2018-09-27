package main

import (
	"encoding/json"
	"log"
	"os"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// 配置文件
type configuration struct {
	DB struct {
		Host, Port, Username, Password, Database string
	}
	URL struct {
		Scheme, Host string
	}
	WX struct {
		Appid, Secret, Token string
	}
	Server struct {
		Host,
		Port string
	}
	Admin int64
}

// init ...
func init() {
	log.SetFlags(log.Lshortfile)
}

// main ...
func main() {
	// 读取配置文件
	file, err := os.Open("config.json")
	if err != nil {
		log.Fatalf(err.Error())
	}
	var config configuration
	if err = json.NewDecoder(file).Decode(&config); err != nil {
		log.Fatalf(err.Error())
	}

	// 初始化WEB服务
	router := gin.Default()

	router.Use(gin.ErrorLogger())

	// 注入配置文件信息
	router.Use(configInfo(config))

	// 自动更新公众号票据
	router.Use(weixinInfo(config))

	// 连接数据库
	connStr := "user=" + config.DB.Username +
		" password=" + config.DB.Password +
		" host=" + config.DB.Host +
		" port=" + config.DB.Port +
		" dbname=" + config.DB.Database
	db := sqlx.MustConnect("postgres", connStr)
	router.Use(database(db))

	// 初始化房间列表
	router.Use(roomList(db))

	keyPair := []byte("43jsdoij^T%fdkjf*fjdJJ2nkjs8*IOFJDlj10))_(1fsljf@1`sdjslf)09fi+_")
	store := sessions.NewCookieStore(keyPair)
	router.Use(sessions.Sessions("session", store))

	router.Use(static.Serve("/", static.LocalFile("./static", false)))
	router.StaticFile("/", "./static/index.html")

	router.GET("/wxapi", getEcho)         //用于微信公众号接口验证
	router.GET("/join", wxAuth)           //用于跳转到微信的授权页面，需要部分提取当前URL
	router.GET("/wxredirect", wxRedirect) //用于授权结果处理，创建Session并跳转到指定业务逻辑页

	router.POST("/user", register)                // 用户注册
	router.POST("/session", login)                // 用户登录
	router.GET("/user_info", getUserInfo)         // 获取用户信息
	router.GET("/user_avator/:id", getUserAvator) // 获取用户头像
	router.GET("/username_list", searchUser)      // 查找用户
	router.POST("/recharge", recharge)            // 用户充值

	router.POST("/room", newRoom)                      // 创建房间
	router.GET("/room/:id", getRoomSetting)            // 获取房间设置信息
	router.GET("/rooms", listRoom)                     // 获取房间列表
	router.GET("/users", listUserInRoom)               // 获取该房间的所有用户
	router.POST("/transaction", transactionInRoom)     // 豆子交易
	router.GET("/rooms/rate", getRate)                 // 获取概率列表
	router.PUT("/rooms/:id/rate", setRate)             // 设置概率
	router.GET("/room/:id/cashflow", getCashFlow)      // 获取当前房间的某用户现金流
	router.GET("/root/:id/statistics", roomStatistics) // 房间统计
	router.PUT("/rooms/:id/user_rate", setUserRate)    // 设置个人概率
	router.GET("/room/:id/user_rate", getUserRate)     // 获取个人概率

	router.GET("/ws", enterTheRoom)                        // 进入房间
	router.GET("/room/:id/red_envelopes", listRedEnvelops) // 获取当前房间的所有红包

	router.GET("/red_envelops/:id", getRedEnvelopInfo) // 获取红包详情

	router.POST("/robot/setting", setRobot)             // 设置机器人自动抢红包
	router.GET("/robot/setting", getRobotSetting)       // 获取机器人设置
	router.POST("/robot/send", autoCreateRedEnvelop)    // 自动发红包
	router.PUT("/robot/send", stopAutoCreateRedEnvelop) // 停止自动发包

	router.Run(config.Server.Host + ":" + config.Server.Port)
}
