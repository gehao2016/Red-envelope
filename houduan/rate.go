package main

import (
	"crypto/rand"
	"math/big"
)

// injectionRate 根据设置的概率微调中雷率
// 1. 根据重试次数开始循环生成新的拆包列表
// 2. 如果是正数
// 2.1 如果中雷，返回结果，否则继续
// 3. 如果是负数
// 3.1 如果不中雷，返回结果，否则继续
// 4 返回最后一次的结果
func injectionRate(rate int, originalMoney int64, number int, mines map[int]bool) ([]int64, error) {
	result := []int64{}

	retryTimes := rate // 重试次数
	var reverse bool   // 负数的话，反转判断条件
	if rate < 0 {
		reverse = true
		retryTimes = -rate
	}

	for t := 0; t <= retryTimes; t++ { // 开始重试
		money := originalMoney
		list := []int64{}
		for i := 1; i <= number; i++ { // 开始生成拆包列表
			if i == number { // 剩下的钱放最后一个包里
				mines[(int(money)+1)%10] = true // 中雷登记
				list = append(list, money+1)
				continue
			}

			// 原理参见createRedEnvelop函数
			newInt := (money / int64(number-i+1)) * 2
			if newInt == 0 {
				mines[1] = true // 中雷登记
				list = append(list, 1)
				continue
			}
			m, err := rand.Int(rand.Reader, big.NewInt(newInt))
			if err != nil {
				return result, err
			}
			mines[int((m.Int64())+1)%10] = true // 中雷登记
			list = append(list, m.Int64()+1)
			money -= m.Int64()
		}

		// 判断是否全部中雷
		boom := true
		for _, b := range mines {
			boom = boom && b
		}
		if (!reverse && boom) || (reverse && !boom) { // 如果符合条件就提前退出
			result = list
			break
		}
		result = list // 取最后一次值
	}

	return result, nil
}
