/*
包含与微信服务器交互的函数
*/
package main

import (
	// "bytes"
	"crypto/sha1"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"io/ioutil"
	"net/http"
	"sort"
	"strconv"
)

// 微信公众号票据的结构体
type weixin struct {
	Token   string `json:"Access_token"`
	Ticket  string `json:"ticket"`
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
}

type wxImage struct {
	Original  string
	Thumbnail string
}

// 更新微信公众号的access_token与jsapi_ticket
func updateToken(config configuration) (weixin, error) {
	var wx weixin
	// 详细说明见 https://mp.weixin.qq.com/wiki/14/9f9c82c1af308e3b14ba9b973f99a8ba.html
	resp, err := http.Get("https://api.weixin.qq.com/cgi-bin/token?" +
		"grant_type=client_credential&appid=" + config.WX.Appid + "&secret=" + config.WX.Secret)
	if err != nil {
		return wx, err
	}
	defer resp.Body.Close()
	err = json.NewDecoder(resp.Body).Decode(&wx)
	if err != nil {
		return wx, err
	}
	if wx.ErrCode != 0 {
		return wx, errors.New(strconv.Itoa(wx.ErrCode) + "," + wx.ErrMsg)
	}
	// 详细说明见 https://mp.weixin.qq.com/wiki/11/74ad127cc054f6b80759c40f77ec03db.html#.E9.99.84.E5.BD.951-JS-SDK.E4.BD.BF.E7.94.A8.E6.9D.83.E9.99.90.E7.AD.BE.E5.90.8D.E7.AE.97.E6.B3.95
	resp, err = http.Get("https://api.weixin.qq.com/cgi-bin/ticket/getticket?" +
		"access_token=" + wx.Token + "&type=jsapi")
	if err != nil {
		return wx, err
	}
	defer resp.Body.Close()
	err = json.NewDecoder(resp.Body).Decode(&wx)
	if err != nil {
		return wx, err
	}
	if wx.ErrCode != 0 {
		return wx, errors.New(strconv.Itoa(wx.ErrCode) + "," + wx.ErrMsg)
	}
	return wx, nil
}

// 用于微信验证本服务器的有效性，详见 https://mp.weixin.qq.com/wiki/8/f9a0b8382e0b77d87b3bcc1ce6fbc104.html#.E7.AC.AC.E4.BA.8C.E6.AD.A5.EF.BC.9A.E9.AA.8C.E8.AF.81.E6.9C.8D.E5.8A.A1.E5.99.A8.E5.9C.B0.E5.9D.80.E7.9A.84.E6.9C.89.E6.95.88.E6.80.A7
func getEcho(c *gin.Context) {
	config := c.MustGet("config").(configuration)
	token := config.WX.Token
	signature := c.Query("signature")
	timestamp := c.Query("timestamp")
	nonce := c.Query("nonce")
	echostr := c.Query("echostr")

	// 将token、timestamp、nonce三个参数进行字典序排序
	p := []string{token, timestamp, nonce}
	sort.Strings(p)

	// 将三个参数字符串拼接成一个字符串
	s := p[0] + p[1] + p[2]

	// 进行sha1加密
	s = fmt.Sprintf("%x", sha1.Sum([]byte(s)))

	if s == signature {
		c.String(http.StatusOK, echostr)
	} else {
		c.String(http.StatusOK, "")
	}
}

// 处理公众号各类消息的函数，目前以事件类消息为主
// 详见 https://mp.weixin.qq.com/wiki/7/9f89d962eba4c5924ed95b513ba69d9b.html
func wxEvent(c *gin.Context) {
	type message struct { //匹配返回的XML消息体的结构体
		FromUserName string
		MsgType      string
		Event        string
	}
	var msg message
	if c.Bind(&msg) == nil {
		if msg.MsgType == "event" && msg.Event == "subscribe" { //订阅事件
			// userRegister(c, msg.FromUserName)
		}
	}
}

// 客户端在js-sdk配置和公众号授权时需要AppID
// https://mp.weixin.qq.com/wiki/11/74ad127cc054f6b80759c40f77ec03db.html#.E6.AD.A5.E9.AA.A4.E4.B8.89.EF.BC.9A.E9.80.9A.E8.BF.87config.E6.8E.A5.E5.8F.A3.E6.B3.A8.E5.85.A5.E6.9D.83.E9.99.90.E9.AA.8C.E8.AF.81.E9.85.8D.E7.BD.AE
// http://mp.weixin.qq.com/wiki/17/c0f37d5704f0b64713d5d2c37b468d75.html#.E7.AC.AC.E4.B8.80.E6.AD.A5.EF.BC.9A.E7.94.A8.E6.88.B7.E5.90.8C.E6.84.8F.E6.8E.88.E6.9D.83.EF.BC.8C.E8.8E.B7.E5.8F.96code
func wxAppid(c *gin.Context) {
	config := c.MustGet("config").(configuration)
	c.JSON(http.StatusOK, gin.H{
		"appid": config.WX.Appid,
	})
}

// 用于跳转到微信的授权页面，附带的room参数为房间号
func wxAuth(c *gin.Context) {
	config := c.MustGet("config").(configuration)
	room := c.Query("room")
	c.Redirect(http.StatusFound, "https://open.weixin.qq.com/connect/oauth2/authorize?"+
		"appid="+config.WX.Appid+
		"&redirect_uri="+config.URL.Scheme+"://"+config.URL.Host+"/wxredirect"+
		"&response_type=code"+
		"&scope=snsapi_userinfo"+
		"&state="+room+
		"#wechat_redirect")
}

// 将获取到的code换取openid，获取/创建用户信息，然后跳转到指定业务逻辑页面
func wxRedirect(c *gin.Context) {
	config := c.MustGet("config").(configuration)
	code := c.Query("code")
	state := c.Query("state")
	openid, token, err := codeToOpenID(config, code)
	if err != nil {
		c.Error(err).SetMeta(gin.H{"error": "连接微信服务器时发生错误"})
		c.Status(http.StatusServiceUnavailable)
		return
	}
	id, err := userIsExists(c, openid)
	if err == sql.ErrNoRows {
		ui := userInfo{}
		ui.Name, ui.Avator, err = wxUserInfo(token, openid)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		ui.OpenID = openid
		ui.Money = 100000
		newID, err := createUser(c, ui)
		if err != nil {
			c.Error(err).SetType(gin.ErrorTypePrivate)
			return
		}
		id = newID
	}
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	session := sessions.Default(c)
	session.Set("uid", id)
	err = session.Save()
	if err != nil {
		c.Error(err).SetType(gin.ErrorTypePrivate)
		return
	}

	if state == "" {
		c.Redirect(http.StatusMovedPermanently, "/#/")
		return
	}
	c.Redirect(http.StatusMovedPermanently, "/#/tab/theRoom?roomId="+state)
}

// code换取openid详见 http://mp.weixin.qq.com/wiki/17/c0f37d5704f0b64713d5d2c37b468d75.html#.E7.AC.AC.E4.BA.8C.E6.AD.A5.EF.BC.9A.E9.80.9A.E8.BF.87code.E6.8D.A2.E5.8F.96.E7.BD.91.E9.A1.B5.E6.8E.88.E6.9D.83access_token
func codeToOpenID(config configuration, code string) (string, string, error) {
	type accessToken struct { //换取到的access_token，只需要openid
		Openid      string
		AccessToken string `json:"access_token"`
	}
	var token accessToken

	resp, err := http.Get("https://api.weixin.qq.com/sns/oauth2/access_token?" +
		"appid=" + config.WX.Appid +
		"&secret=" + config.WX.Secret +
		"&code=" + code +
		"&grant_type=authorization_code")
	if err != nil {
		return token.Openid, token.AccessToken, err
	}
	defer resp.Body.Close()

	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil { //解析返回的JSON数据
		return token.Openid, token.AccessToken, err
	}
	return token.Openid, token.AccessToken, nil
}

// 获取用户基本信息
func wxUserInfo(token string, openID string) (nickname string, avator []byte, err error) {
	type userInfo struct {
		Nickname   string
		Headimgurl string
		Errcode    int
		Errmsg     string
	}
	var i userInfo

	resp, err := http.Get("https://api.weixin.qq.com/sns/userinfo?" +
		"access_token=" + token +
		"&openid=" + openID +
		"&lang=zh_CN")
	if err != nil {
		return
	}
	defer resp.Body.Close()

	if err = json.NewDecoder(resp.Body).Decode(&i); err != nil { //解析返回的JSON数据
		return
	}
	nickname = i.Nickname
	if i.Errcode == 0 {
		resp, err := http.Get(i.Headimgurl)
		if err != nil {
			return nickname, avator, err
		}
		defer resp.Body.Close()
		avator, err = ioutil.ReadAll(resp.Body)
		if err != nil {
			return nickname, avator, err
		}
	} else {
		return nickname, avator, errors.New("can't get user info: " + strconv.Itoa(i.Errcode) + "," + i.Errmsg)
	}
	return
}
