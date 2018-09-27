package main

import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"strings"
	"time"
)

// jiami 加密字符串
func jiami(keyText, plainText string) (string, error) {
	var commonIV = []byte{0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f}

	// 创建加密算法aes
	c, err := aes.NewCipher([]byte(keyText))
	if err != nil {
		return plainText, err
	}

	plainText = time.Now().String() + "userID=" + plainText

	//加密字符串
	cfb := cipher.NewCFBEncrypter(c, commonIV)
	ciphertext := make([]byte, len(plainText))
	cfb.XORKeyStream(ciphertext, []byte(plainText))
	return base64.URLEncoding.EncodeToString(ciphertext), nil
}

// jiemi 解密字符串
func jiemi(keyText, cipherText string) (string, error) {
	var commonIV = []byte{0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f}

	// 创建加密算法aes
	c, err := aes.NewCipher([]byte(keyText))
	if err != nil {
		return cipherText, err
	}

	ct, err := base64.URLEncoding.DecodeString(cipherText)
	if err != nil {
		return cipherText, err
	}

	// 解密字符串
	cfbdec := cipher.NewCFBDecrypter(c, commonIV)
	plainText := make([]byte, len(ct))
	cfbdec.XORKeyStream(plainText, ct)

	s := strings.Split(string(plainText), "userID=")
	return s[1], nil
}
