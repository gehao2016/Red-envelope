package main

import (
	"database/sql"
	"github.com/jmoiron/sqlx"
)

// getMines 返回雷的列表
func getMines(db *sqlx.DB, redEnvelopID int64) (map[int]bool, error) {
	var mine string
	query := "SELECT mine FROM red_envelop WHERE id = $1"
	err := db.QueryRow(query, redEnvelopID).Scan(&mine)
	if err != nil {
		return nil, err
	}

	mines := map[int]bool{}
	for _, m := range mine {
		mines[int(m-'0')] = true
	}

	return mines, nil
}

// getMineInfo 获取雷的赔率
func getMineInfo(db *sqlx.DB, roomID int64, parts, mineNumber int) (float64, error) {
	var multiple float64
	query := "SELECT multiple FROM mine WHERE room_id = $1 AND parts = $2 AND number = $3"
	err := db.QueryRow(query, roomID, parts, mineNumber).Scan(&multiple)
	if err != nil && err != sql.ErrNoRows {
		return multiple, err
	}
	return multiple, nil
}
