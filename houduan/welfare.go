package main

import (
	"github.com/jmoiron/sqlx"
)

// getWelfareConditions 福利的条件为金额对应的福利
func getWelfareConditions(db *sqlx.DB, roomID int64) (map[float64]float64, error) {
	condition := map[float64]float64{}

	query := "SELECT number, welfare FROM welfare WHERE room_id = $1"
	rows, err := db.Queryx(query, roomID)
	if err != nil {
		return condition, err
	}
	defer rows.Close()

	for rows.Next() {
		var n, w float64
		err := rows.Scan(&n, &w)
		if err != nil {
			return condition, err
		}
		condition[n] = w
	}

	return condition, nil
}
