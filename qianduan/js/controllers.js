angular.module('starter.controllers', [])

// 大厅页
.controller('TheHalCtrl', function($scope,$state,locals,passData,$ionicPopup,$timeout,$interval) {

  $('title')[0].innerHTML='全民抢豆';
  chatRecordData=[];
  chatfragment=[];
  selfData={};
  hongBaoOBJ={};
  Identification=0;
  localStorage.removeItem('SnatchHB');
  localStorage.removeItem('whetherBuild');
  $scope.zxrs = 200; // 在线人数
  // 在线人数的随机获取
  $interval(function () {
    var num = parseInt(Math.random()*20+190);
    $scope.zxrs = num;
  },5000);


  $scope.Testurl=TestBaseUrl+'user_info';
  //用户信息获取
  passData.getData($scope.Testurl).then(function(suc){
    if(suc.code==200){
      console.log(suc);
      userID=suc.data.id;
      localStorage.setItem('personalInf',JSON.stringify(suc.data));
    }
  },function(err){
    var myPopup = $ionicPopup.show({
      template : "用户未登陆"
    });
    $timeout(function() {
      myPopup.close(); // 3秒后关闭弹窗
    }, 1000);
    console.log(err);
  })
  //获取房间列表
  $scope.refresh = function () {
    passData.getData(TestBaseUrl+'rooms').then(function(suc){
      if(suc.code==200){
        // 房间数据
        $scope.therooms = suc.data
        for (var i = 0; i < $scope.therooms.length; i ++) {
          if (isNaN(parseInt($scope.therooms[i].name)) == true && isNaN($scope.therooms[i].name) == false) {
            $scope.therooms[i].booles = true;
          } else {
            $scope.therooms[i].booles = false;
          }
        }
        // 存储所有房间数据
        localStorage.setItem("roomData",JSON.stringify($scope.therooms));
        // console.log($scope.therooms);
      } else {
        var myPopup = $ionicPopup.show({
          template : "数据异常"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
      }
    },function(err){
      console.log(err);
      var myPopup = $ionicPopup.show({
        template : "获取数据失败"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1000);
    })
  }
  $scope.refresh();
  // 下拉刷新
  $scope.doRefresh = function () {
    $scope.refresh();
    $scope.$broadcast('scroll.refreshComplete');
  }

  var parameter=window.location.href.split('?')[1];
  if(parameter){
    roomId=parameter.split('=')[1].split('&')[0];
    localStorage.setItem('roomId',parameter.split('=')[1].split('&')[0]);//获取分享网页的roomId号,并储存
  }

  // 房间类型切换
  $scope.according = 0;
  $scope.showHidden = function (num) {
    $scope.according = num;
  }

  // 房间列表显示隐藏
  $scope.room1 = true;
  $scope.room2 = true;
  $scope.room3 = true;
  $scope.ShowHidden1 = function () {
    $scope.room1 = !$scope.room1;
    if($scope.room1 == false) {
      $scope.rotate1 = {"transform":"rotate(180deg)"};
    }else{
      $scope.rotate1 = {"transform":"rotate(0deg)"};
    }
  }
  $scope.ShowHidden2 = function () {
    $scope.room2 = !$scope.room2;
    if($scope.room2 == false) {
      $scope.rotate2 = {"transform":"rotate(180deg)"};
    }else{
      $scope.rotate2 = {"transform":"rotate(0deg)"};
    }
  }
  $scope.ShowHidden3 = function () {
    $scope.room3 = !$scope.room3;
    if($scope.room3 == false) {
      $scope.rotate3 = {"transform":"rotate(180deg)"};
    }else{
      $scope.rotate3 = {"transform":"rotate(0deg)"};
    }
  }

  // 跳转房间页
  $scope.clickTheRoom = function (theroom) {
    $state.go('tab.theRoom',{'roomId':theroom.id});
    sessionStorage.setItem("zdcs" , true);
    sessionStorage.setItem("firstIn" , true);
  }

  sessionStorage.setItem("qrCode",true);
})


// 创建房间页
.controller('MargieCtrl', function($scope, $ionicPopup, $timeout, passData,$state, $ionicScrollDelegate) {
    $('title')[0].innerHTML='开房申请';

  // 第一次进入开房间页提示遮罩
  $scope.prompt = false;
  if (localStorage.getItem('prompts') == undefined ) {
    $scope.prompt = true;
  } else {
    $scope.prompt = false;
  }
  $scope.shutDown = function () {
    $scope.prompt = false;
    localStorage.setItem('prompts',false);
  }

    $scope.urlTest=TestBaseUrl+'room';  // 路径
    // 房间名
    $scope.name = "天字一号包厢";
    // 转换数字函数
    $scope.parseInt = parseInt;
    // 房间时长
    $scope.hours = "8小时";   // 默认时长
    // 房间包数
    $scope.minParts = 5;
    $scope.maxParts = 8;
    // 豆数范围
    $scope.minMoney = 10;
    $scope.maxMoney = 400;
    // 玩法选择
    $scope.ms = false;
    $scope.wbms = false;
    $scope.jq = false;
    $scope.fzqb = false;
    $scope.mine = {};
    $scope.redNumber = ""; // 包数和雷数
    var method3=$('.select-value3').mPicker({
      level:1,
      dataJson:dataJson,
      Linkage:false,
      rows:6,
      idDefault:true,
      header:'<div class="mPicker-header"><a href="javascript:;" class="mPicker-cancel">取消</a><a href="javascript:;" class="mPicker-confirm">确定</a></div>',
      confirm:function(json){
        console.info('当前选中json：', json);
        $scope.hours = json.name;
      },
      cancel:function(json){
        console.info('当前选中json：', json);
      }
    })

  // 房间类型
  $scope.cars = {
    car01 : { brand: "普通房", model : "putong", money : 210},
    car02 : { brand : "亮号房", model : "langhao", money : 262.5},
    car03 : { brand : "VIP房", model : "VIP", money : 250}
   };
  $scope.selectedCar =$scope.cars["car01"] ;
  // console.log($scope.selectedCar);
  $scope.selects = function (selectedData) {
    $scope.selectedCar=selectedData;
    console.log($scope.selectedCar);
  }

  // 布尔值取反
  // 免死
  $scope.takeBack = function () {
    $scope.ms = !$scope.ms;
  }
  // 尾巴免死
  $scope.theTail = function () {
    $scope.wbms = !$scope.wbms;
  }
  // 禁枪
  $scope.control = function () {
    $scope.jq = !$scope.jq;
  }
  // 房主清包
  $scope.clear = function () {
    $scope.fzqb = !$scope.fzqb;
  }

  // 福利倍数div的切换
  $scope.according = 0;
  $scope.showHidden = function (num) {
    $scope.according = num;
  }

  // 开房信息
  var room = {
    "id": null,
    "name":"",
    "hours":"",
    "minParts":"",
    "maxParts":"",
    "minMoney":"",
    "maxMoney":"",
    "welfare":{},
    "singleMineWelfare":{},
    "multiMineWelfare":{},
    "mine":{},
    "ms":"",
    "wbms":"",
    "jq":"",
    "fzqb":""
  };

  // 名称修改
  $scope.nameModify = function (name) {
    $scope.name = name;
  }

  // 豆数范围修改
  $scope.beanRange = function (minMoney,maxMoney) {
    $scope.minMoney = parseInt(minMoney);
    $scope.maxMoney = parseInt(maxMoney);
   console.log(minMoney + "-" + maxMoney);
  }

// -------------------------------------

  //  包数和雷数
  var c = parseInt($scope.minParts),
      d = parseInt($scope.maxParts),
      redNumber = [],
      err = [];
  if (c <= d) {
    for (; c <= d; c ++) {
      redNumber.push({"id" :  c + "" ,"er" : err});
      for (var i = 1; i <= c ; i ++) {
        if (i == 1) {
          err.push({"ol" :  i + "" , 'multiple': 1.5 });
        } else if (i == 2) {
          err.push({"ol" :  i + "" , 'multiple': 1.6 });
        }else if (i == 3) {
          err.push({"ol" :  i + "" , 'multiple': 1.7 });
        }else if (i == 4) {
          err.push({"ol" :  i + "" , 'multiple': 2.2 });
        }else if (i == 5) {
          err.push({"ol" :  i + "" , 'multiple': 2.8 });
        }else if (i == 6) {
          err.push({"ol" :  i + "" , 'multiple': 3.4 });
        }else if (i == 7) {
          err.push({"ol" :  i + "" , 'multiple': 4.2 });
        }else if (i == 8) {
          err.push({"ol" :  i + "" , 'multiple': 4.8 });
        }else if (i == 9) {
          err.push({"ol" :  i + "" , 'multiple': 5.4 });
        }
      }
      err = [];
    }
    // console.log(redNumber);
  } else {
    for (; d < c; d ++) {
      redNumber.push({"id" :  d + "","er" : err});
      for (var i = 1; i <= d; i ++) {
        if (i == 1) {
          err.push({"ol" :  i + "" , 'multiple': 1.5 });
        } else if (i == 2) {
          err.push({"ol" :  i + "" , 'multiple': 1.6 });
        }else if (i == 3) {
          err.push({"ol" :  i + "" , 'multiple': 1.7 });
        }else if (i == 4) {
          err.push({"ol" :  i + "" , 'multiple': 2.2 });
        }else if (i == 5) {
          err.push({"ol" :  i + "" , 'multiple': 2.8 });
        }else if (i == 6) {
          err.push({"ol" :  i + "" , 'multiple': 3.4 });
        }else if (i == 7) {
          err.push({"ol" :  i + "" , 'multiple': 4.2 });
        }else if (i == 8) {
          err.push({"ol" :  i + "" , 'multiple': 4.8 });
        }else if (i == 9) {
          err.push({"ol" :  i + "" , 'multiple': 5.4 });
        }
      }
      err = [];
    }
    console.log(redNumber);
  }
  // console.log(redNumber);
  $scope.redNumber = redNumber;

  // input 事件  遍历包的个数 和 雷的倍数
  $scope.modify = function (minParts,maxParts) {
      $scope.minParts = parseInt(minParts);
      $scope.maxParts = parseInt(maxParts);
      if ($scope.minParts < 5 || $scope.maxParts < 5) {
        $scope.redNumber = "";
        return;
      }
      redNumber = [];
      err = [];
      var a = parseInt(minParts);
      var b = parseInt(maxParts);
      if (a <= b) {
        for (; a <= b; a ++) {
          redNumber.push({"id" :  a + "" ,"er" : err});
          for (var i = 1; i < a ; i ++) {
            if (i == 1) {
              err.push({"ol" :  i + "" , 'multiple': 1.5 });
            } else if (i == 2) {
              err.push({"ol" :  i + "" , 'multiple': 1.6 });
            }else if (i == 3) {
              err.push({"ol" :  i + "" , 'multiple': 1.7 });
            }else if (i == 4) {
              err.push({"ol" :  i + "" , 'multiple': 2.2 });
            }else if (i == 5) {
              err.push({"ol" :  i + "" , 'multiple': 2.8 });
            }else if (i == 6) {
              err.push({"ol" :  i + "" , 'multiple': 3.4 });
            }else if (i == 7) {
              err.push({"ol" :  i + "" , 'multiple': 4.2 });
            }else if (i == 8) {
              err.push({"ol" :  i + "" , 'multiple': 4.8 });
            }else if (i == 9) {
              err.push({"ol" :  i + "" , 'multiple': 5.4 });
            }
          }
          err = [];
        }
        // console.log(redNumber);
      } else {
        for (; b < a; b ++) {
          redNumber.push({"id" :  b + "","er" : err});
          for (var i = 1; i <= b; i ++) {
            if (i == 1) {
              err.push({"ol" :  i + "" , 'multiple': 1.5 });
            } else if (i == 2) {
              err.push({"ol" :  i + "" , 'multiple': 1.6 });
            }else if (i == 3) {
              err.push({"ol" :  i + "" , 'multiple': 1.7 });
            }else if (i == 4) {
              err.push({"ol" :  i + "" , 'multiple': 2.2 });
            }else if (i == 5) {
              err.push({"ol" :  i + "" , 'multiple': 2.8 });
            }else if (i == 6) {
              err.push({"ol" :  i + "" , 'multiple': 3.4 });
            }else if (i == 7) {
              err.push({"ol" :  i + "" , 'multiple': 4.2 });
            }else if (i == 8) {
              err.push({"ol" :  i + "" , 'multiple': 4.8 });
            }else if (i == 9) {
              err.push({"ol" :  i + "" , 'multiple': 5.4 });
            }
          }
          err = [];
        }
      }
      $scope.redNumber = redNumber;
  }

// ------------- 福利 -----------------

  $scope.welfare = {
    "0.01":24,
    "5.20":11,
    "1.11": 11,
    "2.22": 11,
    "3.33": 11,
    "4.44": 11,
    "5.55": 11,
    "6.66": 11,
    "7.77": 11,
    "8.88": 11,
    "9.99": 11,
    "11.11":44,
    "22.22":44,
    "33.33":44,
    "44.44":44,
    "55.55":44,
    "66.66":44,
    "1.23":8,
    "2.34":8,
    "3.45":8,
    "4.56":8,
    "5.67":8,
    "6.78":8,
    "7.89":8,
    "12.34":44,
    "23.45":44,
    "34.56":44,
    "45.67":44,
    "56.78":44,
    "67.89":44,
    "13.14":24,
    "20.18":12
  }

  // 福利修改
  $scope.welfareChange = function (key,value) {
      if (isNaN(parseInt(value))) {
          $scope.welfare[key] = 0;
      } else {
          $scope.welfare[key] = parseInt(value);
      }
      room.welfare = $scope.welfare;
      console.log($scope.welfare);
  }

// ---------- 多个人踩单雷福利 ----------
  $scope.singles = {
      "5" : 88,
      "6" : 188,
      "7" : 288,
      "8" : 388,
      "9" : 888
    };

// 多个人踩单雷福利修改
$scope.singleChange = function (key,value) {
    if (isNaN(parseInt(value))) {
        $scope.singles[key] = 0;
    } else {
        $scope.singles[key] = parseInt(value);
    }
    room.singleMineWelfare = $scope.singles;
    console.log($scope.singles);
}

// ---------- 多个人踩多雷福利 ----------
  $scope.multis = {
      "6" : 188,
      "7" : 288,
      "8" : 388,
      "9" : 888
    }

// 多个人踩多雷福利修改
$scope.multiChange = function (key,value) {
    if (isNaN(parseInt(value))) {
        $scope.multis[key] = 0;
    } else {
        $scope.multis[key] = parseInt(value);
    }
    room.multiMineWelfare = $scope.multis;
    console.log($scope.multis);
}

  //------- 开房提示 显示/隐藏 ------
  $scope.maskPrompt = false;
  //console.log(userID);
  $scope.hiddenDisplay = function (mask,name,minParts,maxParts,redNumber) {
    if (userID == "") {
      var myPopup = $ionicPopup.show({
        template : "用户未登陆,创不了房间!!!"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1500);
      return;
    }
    if ($scope.redNumber == "") {
      var myPopup = $ionicPopup.show({
        template : "请输入最小包数大于或等于5的包数范围!!!"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1500);
      return;
    }
    if ($scope.minMoney < 10 || $scope.maxMoney < 10) {
      var myPopup = $ionicPopup.show({
        template : "请输入豆数最小不能小于10!!!"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1500);
      return;
    } else {
      if ($scope.maxMoney < $scope.minMoney) {
        var myPopup = $ionicPopup.show({
          template : "请输入最大豆数要大于或等于最小豆数!!!"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1500);
        return;
      }
    }
    // 判断钻石是否足够开房间
    if (JSON.parse(localStorage.getItem('personalInf')).money > parseInt($scope.hours)*210) {
      $scope.maskPrompt = mask;
      room.name = $scope.name;
      room.hours = parseInt($scope.hours);
      room.minParts = parseInt($scope.minParts);
      room.maxParts = parseInt($scope.maxParts);
      room.minMoney = parseInt($scope.minMoney);
      room.maxMoney = parseInt($scope.maxMoney);
      room.singleMineWelfare = $scope.singles;
      room.multiMineWelfare = $scope.multis;
      room.ms = $scope.ms;
      room.wbms = $scope.wbms;
      room.jq = $scope.jq;
      room.fzqb = $scope.fzqb;
      room.welfare = $scope.welfare;
      for(var i=0;i<redNumber.length;i++){

        if(!$scope.mine.hasOwnProperty(redNumber[i].id)){
          var mineNext = {};
          for (var j = 0; j < redNumber[i].er.length; j ++ ) {
            if (!mineNext.hasOwnProperty(redNumber[i].er[j].ol)) {
              mineNext[redNumber[i].er[j].ol] = +redNumber[i].er[j].multiple;
            }
          }
          $scope.mine[redNumber[i].id] = mineNext;
        }

      }
      // console.log($scope.mine);
      room.mine = $scope.mine;
      $scope.information = room;
      console.log($scope.information);
    } else {
      $scope.maskPrompt = false;
      var myPopup = $ionicPopup.show({
        template : "您的钻石不足，请充值!!!"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1500);
    }

  }

  // 确定创建房间
  $scope.determine = function () {
    passData.postJsonData(room,$scope.urlTest) .then(function (suc) {
      console.log(suc);
      if(suc.code==200){
        roomId=suc.data.id;
        localStorage.setItem('roomId',suc.data.id)
        $state.go('tab.theRoom',{roomId:suc.data.id});
      } else {
        var myPopup = $ionicPopup.show({
          template : "创建房间异常"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
      }
    }, function (err){
      var alertPopup = $ionicPopup.alert({
        template: '创建失败'
      });
      alertPopup.then(function(res) {

      });
      console.log(err);
    })
  }

  // input 聚焦改变字体颜色和按钮颜色
  $scope.prohibit = false;
  $scope.changeColor = function (bool) {
    $scope.prohibit = bool;
  }

})


// 我的个人页
.controller('AccountCtrl', function($scope, $state, passData, $ionicPopup, $timeout) {
  $('title')[0].innerHTML='我的账户';

  // 头像
  $scope.portrait = "";
  $scope.userId = "";
  // 昵称
  var nums = "";
  if (localStorage.getItem('personalInf')) {
    $scope.personal = JSON.parse(localStorage.getItem('personalInf'));
    if (($scope.personal.id + "").length < 5) {
      for (var i = ($scope.personal.id + "").length;i < 5; i ++) {
        nums += "0";
        $scope.userId = nums + $scope.personal.id;
      }
    } else {
      $scope.userId = $scope.personal.id;
    }

    // 获取头像路径
    $scope.portrait = TestBaseUrlone + $scope.personal.avatorURL;
  } else {
    //$state.go('tab.login');
  }
  // console.log($scope.personal);

  // 跳转钻石充值页
  $scope.topUp = function () {
    $state.go('tab.topUp');
  }

  // 跳转房间记录页
  $scope.roomRecord = function () {
    var myPopup = $ionicPopup.show({
      template : "暂未开通此功能!!!"
    });
    $timeout(function() {
      myPopup.close(); // 3秒后关闭弹窗
    }, 1500);

    // $state.go('tab.roomRecord');
  }

  // 跳转公众二维码
  $scope.publicCodes = function () {
    $state.go('tab.customer');
  }

  // 重新登录
  $scope.theLogin = function () {
    localStorage.removeItem('personalInf');
    //$state.go('tab.login');
  }

  // 充值成功遮罩显示隐藏
  $scope.success = false;

})


// 充值页
.controller('TopUpCtrl', function($scope, $state) {
  $('title')[0].innerHTML='钻石充值';

  //返回个人页
  $scope.GoBack = function () {
    $state.go("tab.account");
  }

  // 充值钱数
  $scope.money = 100;
  $scope.chooseMoney = function (num) {
    $scope.money = num;
  }

  // 充值弹窗隐藏
  $scope.pre = 1;
  $scope.hiddenDisplay = function (hd) {
    $scope.pre = hd;
  }
})


// 房间页
.controller('TheRoomCtrl', function($scope ,$state, $stateParams, webSocket, $timeout,$interval, $location, passData, $ionicPopup, $window,$ionicScrollDelegate,PagePosition,$ionicPlatform,$rootScope) {
  $scope.hongBaoOBJ={};//红包对象信息
  if(hongBaoOBJ){
    $scope.hongBaoOBJ=hongBaoOBJ;
  }
  var parameter=window.location.href.split('room')[1];
  if(parameter){
    localStorage.setItem('roomId',parameter.split('=')[1].split('&')[0]);//获取分享网页的roomId号,并储存
  }else{
    localStorage.setItem('roomId',$stateParams.roomId);//获取分享网页的roomId号,并储存
  }
  roomId=localStorage.getItem('roomId');
  if(!roomId){
    var alertPopup = $ionicPopup.alert({
      template: '没有该房间信息'
    });
    alertPopup.then(function(res) {
      $state.go('tab.theHal');
    });
  }
  // 获取房间数据
  $scope.roomData = JSON.parse(localStorage.getItem("roomData"));
  // console.log($scope.roomData);
  if ($scope.roomData) {
    for (var i = 0; i < $scope.roomData.length; i ++) {
      if ($scope.roomData[i].id == roomId) {
        if ($scope.roomData[i].booles == true) {
          $('title')[0].innerHTML = $scope.roomData[i].minParts + "~" + $scope.roomData[i].maxParts + "包";
        } else {
          $('title')[0].innerHTML = $scope.roomData[i].name;
        }
      }
    }
  } else {
    $('title')[0].innerHTML=roomId+'房间';
  }

  // $('title')[0].innerHTML=roomId+'房间';

  $scope.Testurl=TestBaseUrl+'user_info';
  //如果没有用户信息，获取用户信息并保存
  if(!localStorage.getItem('personalInf')){
    passData.getData($scope.Testurl).then(function(suc){
      if(suc.code==200){
        console.log(suc);
        userID=suc.data.id;
        localStorage.setItem('personalInf',JSON.stringify(suc.data));
      } else {
        var myPopup = $ionicPopup.show({
          template : "获取用户信息异常"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
      }
    },function(err){
      console.log(err);
      var myPopup = $ionicPopup.show({
        template : "获取用户信息失败"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1000);
    })
  }
  $scope.userInf=JSON.parse(localStorage.getItem('personalInf'));//用户信息存储

  //获取房间设置信息
  $scope.roomUrl=TestBaseUrl+'room/'+roomId;
  passData.getData($scope.roomUrl).then(function(suc){
    if(suc.code==200){
      console.log(suc);
      $scope.jq=suc.data.jq;//房间禁抢模式储存
      $scope.fzqb=suc.data.fzqb;//房间房主清包模式储存
      $scope.fzId=suc.data.ownerID;
      sessionStorage.setItem("fangZuId",$scope.fzId);
      $scope.minParts=suc.data.minParts;//房间最低包
      $scope.maxParts=suc.data.maxParts;//房间最高包
      sessionStorage.setItem("ms",suc.data.ms);
      sessionStorage.setItem("wbms",suc.data.wbms);
      if ($scope.fzId == userID) { // 判断用户是否房主
        $scope.statistical = true;
      } else {
        $scope.statistical = false;
      }
    } else {
      var myPopup = $ionicPopup.show({
        template : "获取房间设置信息异常"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
        $state.go('tab.theHal');
      }, 1000);
    }
  },function(err){
    console.log(err);
    var myPopup = $ionicPopup.show({
      template : "获取房间设置信息失败"
    });
    $timeout(function() {
      myPopup.close(); // 3秒后关闭弹窗
    }, 1000);
  })


  //获取机器人设置信息
  $scope.robotUrl=TestBaseUrl+'robot/setting?roomID='+roomId;
  passData.getData($scope.robotUrl).then(function(suc){
    if(suc.code==200){
      // console.log(suc);
      $scope.isUsing=suc.data.isUsing;//机器人自动抢模式
    } else {
      var myPopup = $ionicPopup.show({
        template : "获取房间设置信息异常"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1000);
    }
  },function(err){
    console.log(err);
    var myPopup = $ionicPopup.show({
      template : "获取机器人设置信息失败"
    });
    $timeout(function() {
      myPopup.close(); // 3秒后关闭弹窗
    }, 1000);
  })

  //实现化WebSocket对象，指定要连接的服务器地址与端口
  //获取用户头像地址保存
  $scope.avatorURL='';
  //获取用户信息
  if(localStorage.getItem('personalInf')){
    userID=$scope.userInf.id;
    var uid=$scope.userInf;
    var urlRequest=url+roomId+'&key='+uid.key;
    $scope.avatorURL=JSON.parse(localStorage.getItem('personalInf')).avatorURL.split('/')[1];
  }else{
    $state.go('tab.theHal');
  }
  //console.log(urlRequest);
  if(!urlRequest){
    urlRequest="ws://g.tonghejianzhu.com/ws?roomID="
  }

  var socket = new ReconnectingWebSocket(urlRequest);

  //webSocketIo连接
  $scope.webSocketIo=function(){
    //打开事件
    socket.onopen = function() {
      console.log("Socket已打开");
      oncer=1;
      $scope.whetherBuild=false;
      localStorage.setItem('whetherBuild',$scope.whetherBuild)
    };

    //关闭事件
    socket.onclose = function() {
      console.log("Socket已关闭");
      //$window.location.reload();
      $scope.whetherBuild=true;
      localStorage.setItem('whetherBuild',$scope.whetherBuild);
      if(oncer==1){
        oncer=2;
        socket.open();
      }

    };
    //发生了错误事件
    socket.onerror = function() {
      console.log("发生了错误");
      $scope.whetherBuild=false;
      localStorage.setItem('whetherBuild',$scope.whetherBuild)
    }
  }

    //如果连接没有断开，就不需要重新连接
    if( localStorage.getItem('whetherBuild')){
      if(localStorage.getItem('whetherBuild')=='true'){
        $scope.whetherBuild=true;
      }else{
        $scope.whetherBuild=false;
      }
    }else{
      $scope.whetherBuild=true;
    }
    if($scope.whetherBuild){
      var oncer=1;
      $scope.webSocketIo();
    }
    if(!socket){
      $scope.webSocketIo();
    }
    console.log(socket);

    $scope.Testurl=TestBaseUrl+'users?roomID='+roomId;


    $scope.openBag=false;//抢豆包弹框初始化
    $scope.slow=false;//判断手慢了
    $scope.whetherCheck=false;//判断页面是否刷新
    if(sessionStorage.getItem('freshLenth')){
      $scope.ltLength=chatRecordData.length;
      var freshLenth=sessionStorage.getItem('freshLenth');
      sessionStorage.removeItem('freshLenth')
      $scope.whetherCheck=true;
      $scope.chatRecordData=chatfragment.slice(freshLenth);
    }else{
      var freshLenth=-30;//获取分页数据
      //获取本地聊天记录
      if(chatRecordData.length){
        $scope.chatRecordData=chatRecordData.slice(freshLenth);
        $scope.ltLength=chatRecordData.length;
        console.log(chatRecordData);
      }else{
        //聊天豆包记录
        passData.getData(TestBaseUrl+'room/'+roomId+'/red_envelopes').then(function(suc){
          if(suc.code==200){
            if(suc.data!==null){
              for(var i=0;i<suc.data.length;i++){
                suc.data[i].type='redEnvelop';
                suc.data[i].Identification=Identification;//增加标识
                Identification++;
                suc.data[i].ownerPortrait=TestBaseUrl+$scope.avatorURL+'/'+suc.data[i].ownerID;
                if( suc.data[i].number==suc.data[i].parts.length){
                  suc.data[i].openData=true;
                  suc.data[i].openValue='豆包已抢完';

                }else{
                  for(var n=0;n<suc.data[i].parts.length;n++){
                    if(suc.data[i].parts[n].userID==userID){

                      suc.data[i].openData=true;
                      suc.data[i].openValue='你已领过该豆包';
                    }
                  }
                }
                if(suc.data[i].number<$scope.minParts||$scope.maxParts<suc.data[i].number){
                  suc.data[i].fuli=true;
                }else{
                  suc.data[i].fuli=false;
                }
                if(suc.data[i].ownerID==userID){
                  suc.data[i].ownerMsg=true;
                }else{
                  suc.data[i].ownerMsg=false;
                }
                suc.data[i].position=i;
                //将红包信息存在红包对象中
                if(!$scope.hongBaoOBJ.hasOwnProperty(suc.data[i].id)){
                  $scope.hongBaoOBJ[suc.data[i].id]=suc.data[i];
                }
              }
            }else{
              suc.data=[];
            }

            chatRecordData=suc.data;
            $scope.chatRecordData=chatRecordData.slice(freshLenth);
            $scope.ltLength=chatRecordData.length;
            console.log(chatRecordData);
          } else {
            var myPopup = $ionicPopup.show({
              template : "获取当前房间所有红包信息异常"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 1000);
          }
        },function(err){
          console.log(err);
          var myPopup = $ionicPopup.show({
            template : "获取当前房间所有红包信息失败"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 1000);
        })

      }
    }

    //发送消息
    $scope.sendMassage=function(){
      $scope.textVal=document.getElementById('text');
      if($scope.textVal.value){
        socket.send(JSON.stringify(
          {
            "type": "sendMessage",
            "id":Date.parse(new Date()),
            "body": {
              "userID":$scope.userInf.id,
              "userName":$scope.userInf.name,
              "message":$scope.textVal.value
            }
          })
        );
      }else{
        var myPopup = $ionicPopup.show({
          template:"不能发送空消息"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        },1000);
      }
      $scope.textVal.value="";
      $scope.textVal.focus();

    }
    //创建豆包
    if(sessionStorage.getItem('paramData')){
      var a=$timeout(function(){
        socket.send(sessionStorage.getItem('paramData'));
        sessionStorage.removeItem('paramData');
        $timeout.cancel(a);
      },800);
    }else{}

    // 发豆包内容高度置低
    var div = document.getElementById('scrolldIV');
    var divCentent = document.getElementById('content');
    $scope.wideHigh = {
      "width" : "100%",
      "height" : divCentent.offsetHeight - 90 + "px"
    }
    $scope.divHeight = div.scrollHeight;
    $scope.switch = false; // 判断是否至底
    // 至底函数
     $scope.bottomss=function(){
       $timeout(function () {
         $ionicScrollDelegate.$getByHandle('myscroll').scrollBy(0,div.scrollHeight);
       },10);
     }
    // 监听滚动条事件
    $scope.scrollBar = function () {
      var a = $ionicScrollDelegate.$getByHandle('myscroll').getScrollPosition().top;
      PagePosition.setPosition(parseInt(a));
      $scope.divHeight = div.scrollHeight;
      if (a == 0) {
        sessionStorage.setItem('height',div.scrollHeight);
      }

      if ($scope.divHeight - div.offsetHeight - a <=50) {
        $scope.switch = true; // 判断是否至底
        freshLenth=-30;
        if($scope.whetherCheck){
          $scope.chatRecordData=chatRecordData.slice(freshLenth);
          $scope.whetherCheck=false;
          $scope.$apply();
          $timeout(function () {
            $ionicScrollDelegate.$getByHandle('myscroll').scrollTo(0,50);
          },10);
        }

      }else{
        $scope.switch = false; // 判断是否至底
      }
      //console.log($scope.switch)
    }
    if (PagePosition.getPosition()) {
      $timeout(function () {
        $ionicScrollDelegate.$getByHandle('myscroll').scrollTo(0, PagePosition.getPosition());
      },10)
    }

    //$scope.selfData=[];//自己豆包存一下
    //获得消息事件---------------------
    socket.onmessage = function(msg) {
      //console.log('获取消息');
      s=JSON.parse(msg.data);
      console.log(s)
      if(s.type=='redEnvelop'||s.code==400||s.type=="redEnvelopRecord"||s.type=="redEnvelopMoney"||s.type=="redEnvelopInfo"||s.type=="message"){
          if(s.type=='redEnvelop'){//发红包推送
              if ($scope.switch) {
                $scope.bottomss();
              }else{
                if(s.ownerID==userID){
                  $scope.bottomss();
                }
              }
            //获取发包人的头像
              s.ownerPortrait=TestBaseUrl+$scope.avatorURL+'/'+s.ownerID;
                if(s.ownerID==userID){
                  s.ownerMsg=true;
                  if(selfData.hasOwnProperty(s.id)){
                  }else{
                    selfData[s.id]=s;
                  }

                }else{
                  s.ownerMsg=false;
                }
            s.position=chatRecordData.length;
            //将红包信息存在红包对象中
            if(!$scope.hongBaoOBJ.hasOwnProperty(s.id)){
              $scope.hongBaoOBJ[s.id]=s;
              //hongBaoOBJ[s.id]=s;
            }
            if($scope.minParts<=s.number&&s.number<=$scope.maxParts){
              s.fuli=false;
            }else{
              s.fuli=true;
            }
          }
          if(s.type=='message'){//发消息推送
            s.ownerPortrait=TestBaseUrl+$scope.avatorURL+'/'+s.userID;
              if ($scope.switch) {
                $scope.bottomss();
              }
              if(s.userID==userID){
                $scope.bottomss();
                s.ownerMsg=true;
              }else{
                s.ownerMsg=false;
              }
          }
            s.Identification=Identification;//增加标识
            Identification++;
          if((s.type=='redEnvelopRecord'&&$scope.jq)||(s.type=='redEnvelopMoney'&&$scope.jq)){

          }else{
            chatRecordData.push(s);
            $scope.ltLength=chatRecordData.length;
          }
        //所有消息的时候判断是不是自己的豆包
        // 自己抢过的豆包做下缓存
        if(s.type=="redEnvelopRecord"){
          if ($scope.switch) {
            $scope.bottomss();
          }
          //console.log(selfData);
          if(selfData.hasOwnProperty(s.redEnvelopID)){
            s.self=true;
            if(userID==s.userID){
              s.suc=false;
            }
          }else{
            s.self=false;
            if(userID==s.userID){
              s.suc=true;
            }
          }
          if(userID== s.userID){
            if(!$scope.jq){
              if($scope.hongBaoOBJ.hasOwnProperty(s.redEnvelopID)){
                s.belong=$scope.hongBaoOBJ[s.redEnvelopID].ownerName;
                chatRecordData[$scope.hongBaoOBJ[s.redEnvelopID].position].openData=true;
                chatRecordData[$scope.hongBaoOBJ[s.redEnvelopID].position].openValue='你已领过该豆包';
              }
            }
          }
        }

        //已被抢完的豆包做下缓存 已被抢完的包本地缓存更新
        if(s.type=="redEnvelopInfo"&&s.redEnvelopID){
          if ($scope.switch) {
            $scope.bottomss();
          }
          if($scope.hongBaoOBJ.hasOwnProperty(s.redEnvelopID)){
            s.HBname=$scope.hongBaoOBJ[s.redEnvelopID].message;
            s.belong=$scope.hongBaoOBJ[s.redEnvelopID].ownerName;
            chatRecordData[$scope.hongBaoOBJ[s.redEnvelopID].position].openData=true;
            chatRecordData[$scope.hongBaoOBJ[s.redEnvelopID].position].openValue='豆包被领完';
          }
        }

        //如果有异常情况
        if(s.code==400){
          $scope.closeHb();
        }
        if(!$scope.whetherCheck){
          $scope.chatRecordData=chatRecordData.slice(freshLenth);
        }
        //console.log($scope.chatRecordData);
        $scope.$apply();
        if(s.type=="redEnvelopRecord" && userID== s.userID && !$scope.jq&&!$scope.fzqb&&!$scope.isUsing){
            $state.go('tab.packageDetails',{redEnvelopID:s.redEnvelopID});
        }

      }else if(s.type=='redEnvelopWelfare'){

      }
    };

    //是否查看聊天记录
    $scope.doRefresh=function(){
      freshLenth=freshLenth-40;
      if(!$scope.whetherCheck){
        //sessionStorage.setItem('chatLength',chatRecordData.length)
        chatfragment=chatRecordData.slice(-245,-30);
        if(chatfragment.length<20){
          chatfragment=chatRecordData.slice(-245,-chatfragment.length);
        }
        $scope.whetherCheck=true;
      }

      $scope.chatRecordData=chatfragment.slice(freshLenth);
      if( $scope.chatRecordData.length<chatfragment.length){

      }else{
        var myPopup = $ionicPopup.show({
          template:"没有更多聊天记录了"
        });
        $timeout(function() {
          myPopup.close();
        },800);
      }
      $timeout(function () {
        $ionicScrollDelegate.$getByHandle('myscroll').scrollTo(0, div.scrollHeight - sessionStorage.getItem('height'));
      },10);
    }

    $scope.recordData={};//单个豆包临时数据存储
    //查看豆包详情
    $scope.goDetail=function(record){
      console.log($scope.whetherCheck);
      if($scope.whetherCheck){
        sessionStorage.setItem('freshLenth',freshLenth)
      }

      $state.go('tab.packageDetails',{redEnvelopID:record.id});
    }

    //关闭豆包弹框
    $scope.closeHb=function(){
      $scope.openBag=false;
      var oChai = document.getElementById("chai");
      oChai.removeAttribute("class", "rotate");
    };

    //开启豆包弹框
    $scope.openHb=function(recordData){
      $scope.openBag=false;
      $scope.recordData=recordData;
      if($scope.recordData.ownerID==userID){
        $scope.recordData.ownerShow=true;
      }else{
        $scope.recordData.ownerShow=false;
      }
      localStorage.setItem("redData",JSON.stringify(recordData));
      if(recordData.openData){
        console.log($scope.whetherCheck);
        if($scope.whetherCheck) {
          sessionStorage.setItem('freshLenth', freshLenth);
        }
        $state.go('tab.packageDetails',{redEnvelopID:recordData.id});
      }else{
        $scope.openBag=true;
      }

    }

    //抢豆包
    $scope.robHB=function(record){
      console.log(record);
      var oChai = document.getElementById("chai");
      oChai.setAttribute("class", "rotate");
      $timeout(function(){
        $scope.openBag=false;
        socket.send(JSON.stringify({
          "type": "grabRedEnvelop",
          "id":Date.parse(new Date()),
          "body": {
            "redEnvelopID":record.id
          }
        }));
      },700);
    }


    // ------房间分享弹窗---------
    $scope.url = TestBaseUrl + "join?room=" + roomId;
    $scope.codeShow = false; // 二维码弹窗显示隐藏
    $scope.shareRoom = function (bool) {
      $scope.codeShow = bool;
      // 二维码

      $scope.makeCode = function () {
        var qrcode = new QRCode(document.getElementById("qrcode"), {
          width : 120,
          height : 120
        });
        var elText = document.getElementById("texts");
        elText.value = $scope.url;
        qrcode.makeCode(elText.value);
      }
      if (bool) {
        if (sessionStorage.getItem("qrCode") == "true" || sessionStorage.getItem("qrCode") == undefined) {
          $scope.makeCode();
          sessionStorage.setItem("qrCode",false);
        }
      }
    }

    // 复制链接
    $scope.copyLink = function () {
      var input = document.getElementById("texts");
      //console.log($scope.url);
      input.value = $scope.url; // 修改文本框的内容
      //console.log(input.value);
      input.select(); // 选中文本
      document.execCommand("copy"); // 执行浏览器复制命令
      $scope.codeShow = false;
    }


  // -------成员列表功能-------
    $scope.bean = ""; // 豆
    $scope.not = false;  // 显示输入框开关
    $scope.judge =false; // 控制上下豆按钮背景颜色
    $scope.storage = []; // 存储上下豆成员和数据
    $scope.search = "";  // 成员列表搜索关键字
  // 输入框的显示和隐藏函数
    $scope.showHidden = function () {
      $scope.not = !$scope.not;
      $scope.judge = !$scope.judge;
      for(var i=0;i<document.getElementsByClassName('theRoom_numberBeans').length;i++){
        document.getElementsByClassName('theRoom_numberBeans')[i].value='';
        document.getElementsByClassName('checkBoole')[i].checked=false;
        $scope.storage=[];
      };
    }

    //选择框逻辑判断
    $scope.qieHuan=function(roomdata){
      // console.log(roomdata);
      var allCheck=false;
      for(var i=0;i<document.getElementsByClassName('theRoom_numberBeans').length;i++){
        if(document.getElementsByClassName('checkBoole')[i].checked){
          $scope.roomdatas[i].boole=true;
          allCheck=true;
        }else{
          $scope.roomdatas[i].boole=false;
          document.getElementsByClassName('theRoom_numberBeans')[i].value = "";
        }
      };
      if(!allCheck){
        $scope.storageList='';

      }
    }
    $scope.yhdou='';

    //输入框输入内容时逻辑判断
    $scope.change=function(item,bean){
      if (bean < 0 ) {
        var myPopup = $ionicPopup.show({
          template : "请输入正整数!!!"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1500);
        return;
      }
      for(var i=0;i<$scope.roomdatas.length;i++){
        if($scope.roomdatas[i].id==userID){
          $scope.yhdou=$scope.roomdatas[i]
        }
      }
      var isfalse=false;
        if($scope.storage.length){
          for(var i=0;i<$scope.storage.length;i++){
           if($scope.storage[i].toUsers){
             if($scope.storage[i].toUsers==item.id){
               isfalse=true
               $scope.storage[i].Money=bean;
             }
           }

          }

          if(!isfalse){
            $scope.storage.push({"toUsers":item.id,"Money" : bean });
          }
        }else{
          $scope.storage.push({ "toUsers":item.id,"Money" : bean });
        }
      $scope.storageList={
        "roomID":parseInt(roomId),
        "transactions":$scope.storage
      }
      //console.log($scope.storage);
    }
    $scope.transaction=TestBaseUrl+'transaction';

    //确定分配豆
    $scope.fenpei=function(){
      console.log($scope.storageList);
      //加豆接口请求
      if($scope.storageList){
        passData.postJsonData($scope.storageList,$scope.transaction).then(function (data) {
          console.log(data);
          if(data.code==200){
            var alertPopup = $ionicPopup.alert({
              template: '加豆成功'
            });
            alertPopup.then(function(res) {
              //成员列表请求
            });
            $scope.memberList();
            $scope.storageList='';
          }else{
            var alertPopup = $ionicPopup.alert({
              template: '余额不足'
            });
            alertPopup.then(function(res) {

            });
          }
        },function (err) {
          var myPopup = $ionicPopup.show({
            template : "输入数字错误"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 2000);
          console.log(err);
        })
      }else{
        var alertPopup = $ionicPopup.alert({
          template: '请选择用户,并输入不大于余额的豆数'
        });
        alertPopup.then(function(res) {
          //console.log('1');
        });
      }

      for(var i=0;i<document.getElementsByClassName('theRoom_numberBeans').length;i++){
        document.getElementsByClassName('theRoom_numberBeans')[i].value='';
        document.getElementsByClassName('checkBoole')[i].checked=false;
        $scope.storage=[];
      };

    }

    // 成员列表数据
    $scope.list = document.getElementById('theRoom_lists');
    $scope.WideHigh = {
      'width' : '100%',
      'height' : $scope.list.offsetHeight - 84 + "px"
    }

    // 成员列表的显示隐藏
    $scope.members = false;
    // 遮罩层显示隐藏方法
    //成员列表请求
    $scope.memberList=function(){
      passData.getData($scope.Testurl).then(function(suc){
        console.log(suc);
        if(suc.code==200){
          for(var i=0,lt=suc.data.length;i<suc.data.length;i++){
            suc.data[i].ownerPortrait = TestBaseUrl + $scope.avatorURL + '/' + suc.data[i].id;

            if($scope.fzId==suc.data[i].id){
              suc.data[i].fzIcon=true;
              var fzDz=suc.data[i];
              suc.data.splice(i,1);
              suc.data.unshift(fzDz);
            }else{
              suc.data[i].fzIcon=false;
              if(userID==suc.data[i].id){
                var fzDz=suc.data[i];
                suc.data.splice(i,1);
                suc.data.unshift(fzDz);
              }
            }
          }
          $scope.roomdatas=suc.data
          $scope.num =$scope.roomdatas.length;
        } else {
          var myPopup = $ionicPopup.show({
            template : "成员列表请求异常"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 1000);
        }
      },function(err){
        console.log(err);
        var myPopup = $ionicPopup.show({
          template : "成员列表请求失败"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
      })
      if($scope.statistical){
        passData.getData(TestBaseUrl+'root/'+roomId+'/statistics').then(function(suc){
          console.log(suc);
          if(suc.code==200){
            $scope.beanCounts = suc.data;
          } else {
            var myPopup = $ionicPopup.show({
              template : "获取数据异常"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 1000);
          }
        },function(err){
          var myPopup = $ionicPopup.show({
            template : "获取数据失败!!!"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 2000);
          console.log(err);

        })
      }
    }



    $scope.SHMembers = function (boolean,boole) {
      if(boolean){
        $scope.memberList();
      }
      $scope.members = boolean;
      if(!$scope.members){
        $scope.storage=[];
      }
      $scope.judge = false;
      $scope.not = false;
      $scope.search = "";
      storage = [];
    }

    // 房间功能的显示隐藏
    $scope.SHred = false;
    $scope.ShowHidden = function () {
     $scope.SHred = !$scope.SHred;
     $scope.bottomss();
    }
    $scope.shows = function () {
      $scope.SHred = false;
    }

    // 跳转发豆包页
    $scope.redPackets = function () {
      $state.go('tab.redPackets');
    }

    // 跳转机器人页
    $scope.robotPage = function () {
      $state.go('tab.robotPage');
    }

    // 跳转中包记录页
    $scope.mediumPacketRecord = function () {
      $state.go('tab.mediumPacketRecord');
    }

    // 跳转聊天记录
    $scope.chatRecord = function () {
      $state.go('tab.chatRecord');
    }

    // 跳转豆包详情页
    $scope.packageDetails = function () {
      $state.go('tab.packageDetails');
    }

    // 返回大厅跳转大厅页
    $scope.theHal = function () {
      oncer=2;
      socket.close();
      //window.location.reload();
      $state.go('tab.theHal');
    }

    if (!!sessionStorage.getItem("zdcs")){
      $scope.bottomss();
      sessionStorage.removeItem("zdcs");
    }

  })


// 豆包详情页
.controller('PackageDetailsCtrl', function($scope,$stateParams,$state,passData) {
    $('title')[0].innerHTML = '全民抢豆';
    console.log($stateParams.redEnvelopID);
    $scope.headAddressUrl = TestBaseUrl + "user_avator/";
    $scope.redEnvelops=TestBaseUrl+'red_envelops/'+$stateParams.redEnvelopID;
    $scope.redEnvelopID='';
    $scope.fzId=sessionStorage.getItem("fangZuId");
    $scope.ms=sessionStorage.getItem("ms");
    $scope.wbms=sessionStorage.getItem("wbms");
    //豆包详情接口请求
    passData.getData($scope.redEnvelops).then(function(suc){
      console.log(suc);
      if(suc.code==200){
        $scope.redEnvelopID = suc.data.ID  //接受豆包Id参数
        $scope.details=suc.data.Parts;
        $scope.length= $scope.details.length;//已抢几个包
        $scope.moy=0;//已抢多少金额
        $scope.hongBaoData='';//该豆包信息
        $scope.first=true;
        console.log(hongBaoOBJ);
        if(hongBaoOBJ.hasOwnProperty($scope.redEnvelopID)){
          $scope.hongBaoData=hongBaoOBJ[$scope.redEnvelopID]
        }
        console.log($scope.hongBaoData);
        $scope.ownerSelf=false;//是否是自己的包
        if($scope.hongBaoData.ownerID==userID){
          $scope.ownerSelf=true;
        }
        $scope.hongBaoData.money=$scope.hongBaoData.message.split('/')[0]
        console.log($scope.wbms);
        console.log($scope.details[$scope.details.length-1]);

          for(var j=$scope.details.length-1;j>=0;j--) {
            //if($scope.details[j].mine=='尾巴免死'){
            //  $scope.details[j].mineV=1;
            //}else if($scope.details[j].mine=='房主免死'){
            //  $scope.details[j].mineV=2;
            //}else{
            //  $scope.details[j].mineV=3;
            //}
            if($scope.hongBaoData.number==$scope.details.length){
              if ($scope.ms == 'true' && $scope.details[j].userID == $scope.fzId && $scope.first) {
                $scope.details[j].mineV = 2;
                $scope.first = false
              } else {
                if ($scope.details[j].mine) {
                  $scope.details[j].mineV = 3;
                }
              }
              if($scope.wbms=='true'){
                $scope.details[0].mineV=1;
              }
            }
            $scope.moy=$scope.moy+parseFloat($scope.details[j].money);
          }



        $scope.hongBaoData.moy=$scope.moy.toFixed(2);
        console.log($scope.details);
      } else {
        var myPopup = $ionicPopup.show({
          template : "获取红包详情异常"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
      }
    },function(err){
      console.log(err);
      var myPopup = $ionicPopup.show({
        template : "获取红包详情失败"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1000);
    })

    roomId=localStorage.getItem('roomId')
    $scope.GoBack=function(){
      $state.go('tab.theRoom',{'roomId':roomId});
    }

    //localStorage.setItem("redData",JSON.stringify(s));
    if(localStorage.getItem('redData') ){
      $scope.chatRecordData=JSON.parse(localStorage.getItem('redData'))
    }

})


  // 发豆页
.controller('RedPacketsCtrl', function ($scope, $state, $ionicPopup, $timeout, passData) {
    $('title')[0].innerHTML='发豆包';

    // 第一次进入发豆页提示遮罩
    $scope.prompt = false;
    if (localStorage.getItem('prompt') == undefined ) {
      $scope.prompt = true;
    } else {
      $scope.prompt = false;
    }
    $scope.shutDown = function () {
      $scope.prompt = false;
      localStorage.setItem('prompt',false);
    }

        $scope.paramData={
          "type": "sendRedEnvelop", // 类型: 发豆包
          "id":'',      // 唯一标识，可由Date.parse(new Date())产生
          "body": {                 // 消息体，包含具体的消息
            "money": 100,           // 豆包金额
            "number": 5,            // 豆包数量
            "mine": "159",          // 雷
            "message": "100/3"      // 留言
          }
        };
        // 钱
        $scope.money = "";  // 豆包金额
        $scope.number= "";  // 豆包数量
        $scope.mine = "";   // 雷
        $scope.remarks= ""; // 备注
        $scope.minPackets = ""; // 包数范围小
        $scope.maxPackets = ""; // 包数范围大
        $scope.minMoney = ""; // 豆数范围小
        $scope.maxMoney = ""; // 豆数范围大
        roomId=localStorage.getItem('roomId')
        $scope.GoBack=function(){
          sessionStorage.setItem("zdcs" , true);
          // $state.go('tab.theRoom',{'roomId':roomId});
          window.location = "#/tab/theRoom?roomId=" + roomId;
        }
      $scope.zhi = isNaN(parseInt($scope.number));
    // 获取包数范围
        // console.log(roomId);
        passData.getData(TestBaseUrl + 'room/' + roomId).then(function(suc){
          if(suc.code==200){
            // 房间数据
            $scope.minPackets = suc.data.minParts;
            $scope.maxPackets = suc.data.maxParts;
            $scope.minMoney = suc.data.minMoney; // 豆数范围小
            $scope.maxMoney = suc.data.maxMoney; // 豆数范围大
          } else {
            var myPopup = $ionicPopup.show({
              template : "获取房间设置信息异常"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 1000);
          }
        },function(err){
          console.log(err);
          var myPopup = $ionicPopup.show({
            template : "获取房间设置信息失败"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 1000);
        });
        // 确认发包
        $scope.sendhb=function(money,number,mine,remarks,minPackets,maxPackets){
          $scope.paramData.body.money=parseInt(money);
          $scope.paramData.body.number=parseInt(number);
          $scope.paramData.body.mine=mine;
          $scope.paramData.body.message=remarks;
          $scope.paramData.id=Date.parse(new Date());
          console.log($scope.paramData);
          sessionStorage.setItem('paramData',JSON.stringify($scope.paramData));
          // $state.go('tab.theRoom',{'roomId':roomId});
          window.location = "#/tab/theRoom?roomId=" + roomId;
        }

        // 提示发包遮罩的显示隐藏
        $scope.maskPrompt = false;
        $scope.hiddenDisplay = function (bool,minPackets,maxPackets,number,money,mine,remarks) {
          if(number==''){
            number=document.getElementsByClassName('number1')[0].value
          }
          if(mine==''){
            mine=document.getElementsByClassName('mine1')[0].value
          }
          if (money == "") {
            var myPopup = $ionicPopup.show({
              template:"豆数不能为空"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 1000);
            return;
          } else if (number == "") {
            var myPopup = $ionicPopup.show({
              template:"包数不能为空"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 1000);
            return;
          } else if (mine == "") {
            var myPopup = $ionicPopup.show({
              template:"备注不能为空"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 1000);
            return;
          } else if (money%10 != 0) {
            var myPopup = $ionicPopup.show({
              template:"豆数为10的倍数"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 1000);
            return;
          } else if (money > $scope.maxMoney || money < $scope.minMoney) {
            var myPopup = $ionicPopup.show({
              template:"发豆数不在范围之内!!!"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 1000);
            return;
          } else {
            if (money > 400 && mine.length < 4) {
              var myPopup = $ionicPopup.show({
                template:"豆数大于400,炸弹不能小于4个!!!"
              });
              $timeout(function() {
                myPopup.close(); // 3秒后关闭弹窗
              }, 1000);
              return;
            } else {
              if(number >= mine.length){
                if (number <= maxPackets && number >= minPackets || number >= maxPackets && number <= minPackets) {
                  var num = 0;
                  for (var i = 0;i < mine.length; i++) {
                    for (var j = i+1;j < mine.length; j++) {
                      if (mine[i] == mine[j]) {
                        num ++
                      }
                    }
                  }
                  if (num > 0) {
                    $ionicPopup.show({
                      title: '提示',
                      template:"备注内容有重复,重复内容算一个,确定要发吗？",
                      scope: $scope,
                      buttons: [
                        { text: '取消' },
                        {
                          text: '<b>确定</b>',
                          type: 'button-positive',
                          onTap: function(e) {
                            $scope.paramData.body.money=parseInt(money);
                            $scope.paramData.body.number=parseInt(number);
                            $scope.paramData.body.mine=mine;
                            $scope.paramData.body.message=remarks;
                            $scope.paramData.id=Date.parse(new Date());
                            console.log($scope.paramData);
                            sessionStorage.setItem('paramData',JSON.stringify($scope.paramData));
                            $state.go('tab.theRoom',{'roomId':roomId});
                          }
                        }
                      ]
                    }).then(function() {
                      console.log('Tapped!');
                    });
                    num = 0;
                  } else {
                    $scope.maskPrompt = bool;
                  }

                } else {
                  $scope.packets = true;
                }
              }else{
                var myPopup = $ionicPopup.show({
                  template:"包数不能小于备注个数"
                });
                $timeout(function() {
                  myPopup.close(); // 3秒后关闭弹窗
                }, 1000);
              }
            }
          }
        }

        // 提示发超出包范围的弹窗
        $scope.packets = false;  // 显示隐藏
        $scope.trueFalse = function () {
          $scope.packets = false;
        }
        // 超出包数，确定发包
        $scope.awarding = function (money,number,mine,remarks) {
          $scope.paramData.body.money=parseInt(money);
          $scope.paramData.body.number=parseInt(number);
          $scope.paramData.body.mine=mine;
          $scope.paramData.body.message=remarks;
          $scope.paramData.id=Date.parse(new Date());
          console.log($scope.paramData);
          sessionStorage.setItem('paramData',JSON.stringify($scope.paramData));
          $state.go('tab.theRoom',{'roomId':roomId});
        }

        // input 聚焦事件
        $scope.font = 0;
        $scope.focusing = function (num) {
          $scope.font = num;
        }

        // input 修改事件
        $scope.displayBlack = false;
        $scope.modifyValue = function (money,mine,number) {
          $scope.money = money;
          $scope.number = number;
          $scope.mine = mine;
          $scope.remarks= money + "/" + mine;
          $scope.zhi = isNaN(parseInt(number));
          if (money > 400) {
            $scope.displayBlack = true;
          } else {
            $scope.displayBlack = false;
          }
        }
  })


// 机器人页
.controller('RobotPageCtrl', function ($scope,passData,$ionicPopup,$timeout,$state) {
    $('title')[0].innerHTML='机器人页';
    // input 禁止输入
    $scope.prohibit = true;

    // 房间数据
    $scope.roomWelfare = ""; // 福利
    $scope.roomMultiple = ""; // 倍数
    $scope.ms = ""; // 免死
    $scope.wbms = ""; // 尾巴免死
    $scope.jq = ""; // 禁枪
    $scope.fzqb = ""; // 房主清包
    $scope.getTheData = function () {
      passData.getData(TestBaseUrl + 'room/' + roomId).then(function(suc){
        if(suc.code==200){
          // 房间数据
          $scope.roomDatas = suc.data; // 房间数据
          console.log($scope.roomDatas);
          $scope.roomWelfare = suc.data.welfare; // 福利
          $scope.roomMultiple = suc.data.mine; // 倍数
          $scope.ms = suc.data.ms; // 免死
          $scope.wbms = suc.data.wbms; // 尾巴免死
          $scope.jq = suc.data.jq; // 禁枪
          $scope.fzqb = suc.data.fzqb; // 房主清包
        } else {
          var myPopup = $ionicPopup.show({
            template : "获取房间设置信息异常"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 1000);
        }
      },function(err){
        console.log(err);
        var myPopup = $ionicPopup.show({
          template : "获取房间设置信息失败"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
      })
    }
    $scope.getTheData();


    //返回
    $scope.theRoom = function () {
      $state.go('tab.theRoom',{'roomId':roomId});
      sessionStorage.setItem("zdcs" , true);
    }

  })


// 余豆页
.controller('MediumPacketRecordCtrl', function ($scope,$state,passData) {
    $('title')[0].innerHTML='余豆';
  $scope.portrait = TestBaseUrl + "user_avator/" + userID;  // 头像路径

  // 获取中包记录
    $scope.refresh = function () {
      passData.getData(TestBaseUrl + 'room/' + roomId + "/cashflow").then(function(suc){
        if(suc.code==200){
          // 房间数据
          $scope.datails = suc.data; // 房间数据
        } else {
          var myPopup = $ionicPopup.show({
            template : "获取数据异常"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 1000);
        }
      },function(err){
        console.log(err);
        var myPopup = $ionicPopup.show({
          template : "获取数据失败"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
      })
    }
    $scope.refresh();

    // 下拉刷新
    $scope.doRefresh = function () {
      $scope.refresh();
      $scope.$broadcast('scroll.refreshComplete');
    }

    $scope.GoBack=function(){
      $state.go('tab.theRoom',{'roomId':roomId});
      sessionStorage.setItem("zdcs" , true);
    }
  })


// 秒抢
.controller('ChatRecordCtrl', function ($scope,$state,passData,$ionicPopup,$timeout) {
    $('title')[0].innerHTML='秒抢';

  $scope.rightWrong = false; // 用户id是否等于房主id

  $scope.getTheData = function () {
    passData.getData(TestBaseUrl + 'room/' + roomId).then(function(suc){
      if(suc.code==200){
        // 房间数据
        $scope.roomDatas = suc.data; // 房间数据
        console.log($scope.roomDatas);
        // 判断自己是不是房主
        if ($scope.roomDatas.ownerID == userID) {
          $scope.rightWrong = true; // 用户id是否等于房主id
        } else {
          $scope.rightWrong = false; // 用户id是否等于房主id
        }
        // console.log($scope.rightWrong);
      } else {
        var myPopup = $ionicPopup.show({
          template : "获取房间数据异常"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
      }
    },function(err){
      console.log(err);
      var myPopup = $ionicPopup.show({
        template : "获取房间数据失败"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1000);
    })
  }
  $scope.getTheData();


  // 秒抢
  // $scope.isUsing = false; // 是否激活秒抢
  $scope.second = ""; // 秒抢秒数
  $scope.setting = { // post data
    "roomID" : parseInt(roomId),
    "second" : 0,
    "isUsing" : false
  };
  $scope.Testurl = TestBaseUrl + "robot/setting"; // post 地址

  // 是否设置秒抢
  // $scope.determine = function (isUsing) {
  //   // $scope.isUsing = !$scope.isUsing;
  //    $scope.isUsing = isUsing;
  //   // console.log($scope.isUsing);
  //   document.getElementsByClassName("robotpage_input1").disabled = false;
  //   $scope.setting.isUsing = $scope.isUsing;
  //   // console.log($scope.setting);
  //   if ($scope.isUsing == false) {
  //     $scope.setting = {
  //       "roomID" : parseInt(roomId),
  //       "second" : 0,
  //       "isUsing" : false
  //     };
  //     $scope.isUsing == false;
  //     $scope.second = "";
  //     document.getElementsByClassName("robotpage_input1").value = ""
  //     document.getElementsByClassName("robotpage_input1").disabled = true;
  //   }
  // }

  // 获取秒抢秒数
  $scope.modify = function (num) {
    if(num > 0){
      $scope.setting.isUsing = true;
      $scope.setting.second = parseInt(num)/1000;
    }else{
      $scope.setting.isUsing = false;
      $scope.setting.second=0;
    }
  }

  // 显示遮罩
  $scope.maskPrompt = false;
  $scope.hiddenDisplay = function (bool) {
    console.log($scope.setting);
    if ($scope.setting.isUsing) {
      if ($scope.rightWrong) {
        if ($scope.setting.second > 9 || $scope.setting.second < 1) {
          var myPopup = $ionicPopup.show({
            template:"时间限制1000~9000之间的整数"
          });
          $timeout(function() {
            myPopup.close(); // 2秒后关闭弹窗
          }, 1500);
          return;
        } else {
          console.log($scope.setting);
        }
      } else {
        if ($scope.setting.second > 9 || $scope.setting.second < 2) {
          var myPopup = $ionicPopup.show({
            template:"时间限制2000~9000之间的整数"
          });
          $timeout(function() {
            myPopup.close(); // 2秒后关闭弹窗
          }, 1500);
          return;
        } else {
          console.log($scope.setting);
        }
      }

    } else {
      $scope.setting = {
        "roomID" : parseInt(roomId),
        "second" : 0,
        "isUsing" : false
      };
    }
    $scope.maskPrompt = bool;
  }

  // 确认修改秒抢秒数
  $scope.sureModify = function () {
    passData.postJsonData($scope.setting,$scope.Testurl).then(function (data) {
      if(data.code==200){
        sessionStorage.setItem("zdcs" , true);
        var myPopup = $ionicPopup.show({
          template:"修改成功"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
        $timeout(function() {
          $state.go('tab.theRoom',{'roomId':roomId});
        }, 1100);
      } else {
        var myPopup = $ionicPopup.show({
          template : "修改秒抢异常"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
      }
      // 修改成功，重新获取秒抢数据
      $scope.seconds();
    },function (err) {
      console.log(err);
      var myPopup = $ionicPopup.show({
        template : "修改秒抢失败"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1000);
    })
    $scope.maskPrompt = false;
  }

  // 获取秒抢数据
  $scope.filterUrl = TestBaseUrl + "robot/setting?roomID=" + roomId;
  $scope.seconds = function () {
    passData.getData($scope.filterUrl).then(function(suc){
      if(suc.code==200){
        // 房间数据
        $scope.userLists = suc.data;
        console.log($scope.userLists);
        // $scope.isUsing = $scope.userLists.isUsing;
        $scope.second = $scope.userLists.second*1000; // 秒抢秒数
        if ($scope.second == 0) {
          $scope.second = ""; // 秒抢秒数
        }
        $scope.setting = {
          "roomID" : parseInt(roomId),
          "second" : $scope.second/1000,
          "isUsing" : $scope.userLists.isUsing
        };
      } else {
        var myPopup = $ionicPopup.show({
          template : "获取数据异常"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 1000);
      }
    },function(err){
      console.log(err);
      var myPopup = $ionicPopup.show({
        template : "获取数据失败"
      });
      $timeout(function() {
        myPopup.close(); // 3秒后关闭弹窗
      }, 1000);
    })
  }
  $scope.seconds();


  $scope.GoBack=function(){
      $state.go('tab.theRoom',{'roomId':roomId});
      sessionStorage.setItem("zdcs" , true);
    }
      })


// 房间记录页
.controller('RoomRecordCtrl', function ($scope, packageDetails, $state) {
    $('title')[0].innerHTML='房间记录';
        // $scope.datails = packageDetails.all();
        $scope.datails = [];

        // 返回个人页
        $scope.GoBack = function () {
          $state.go("tab.account");
        }
        // 房主/玩家切换
        $scope.index = 1;
        $scope.ShowHidden = function (num) {
          $scope.index = num;
        }
      })


// 联系客服页
  .controller('CustomerCtrl', function ($scope, $state) {
    $('title')[0].innerHTML='联系客服';

    // 返回个人页
    $scope.GoBack = function () {
      $state.go("tab.account")
    }
  })


// 登录页
.controller('LoginCtrl', function ($scope, $state, locals, $ionicPopup, $interval, passData, $timeout) {
    $('title')[0].innerHTML='登录';
    $scope.description = "获取验证码";
    $scope.ban = true;  // 验证码输入框禁用
    var second=59;
    var timerHandler;
    var verification;
    // 获取验证码函数
    $scope.getTestCode = function () {
      $scope.ban = false;
      timerHandler = $interval(function () {
        if (second<=0) {
          $interval.cancel(timerHandler);
          second=59;
          $scope.description="获取验证码";
        }else{
          $scope.description=second+"秒后重发";
          second--;
        }
      },1000);
      verification = 888888;
    }

    $scope.loginuser = {
      phone:"",
      yzm:""
    };

    // input 改变，按钮跟着改变
    $scope.submit = false;
    $scope.ipt = function (num) {
      $scope.submit = num;
    }

    // 登录按钮函数 跳转首页
    $scope.doLogin = function (loginuser) {
      locals.set("isLoad","isLoad");
      $scope.urlTest=TestBaseUrl+'session';  // 路径
      var phone_yz = /^(13[0-9]|14[5|7]|15[0|1|2|3|5|6|7|8|9]|18[0|1|2|3|5|6|7|8|9])\d{8}$/;
      var yzm_yz = /^\d{6}$/;
      if (!loginuser.phone && !loginuser.yzm) {
        var myPopup = $ionicPopup.show({
          title:"输入不能为空"
        });
        $timeout(function() {
          myPopup.close(); // 2秒后关闭弹窗
        }, 2000);
      }else{
        if (!phone_yz.test(loginuser.phone)) {
          var myPopup = $ionicPopup.show({
            title:"手机号不正确"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 2000);
        }else if (!yzm_yz.test(loginuser.yzm)) {
          var myPopup = $ionicPopup.show({
            title:"验证码不正确"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 2000);
        }else{
          if (loginuser.yzm == verification) {
            // 连接后端，获取登录数据
            passData.postJsonData(loginuser,$scope.urlTest) .then(function (data) {
              $scope.loginData = data.data;
              userID=data.data.userID;
              localStorage.setItem('personalInf',JSON.stringify($scope.loginData));
              console.log(data.data);
              console.log( $scope.loginData);
              if(data.code==200){
                $state.go("tab.theHal");
              }
            }, function (err){
              console.log(err);
            })
          } else {
            var myPopup = $ionicPopup.show({
              title:"测试：验证码请输入 888888 ！"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 2000);
          }

        }
      }
    }

    // 跳转注册页
    $scope.registered = function () {
      $state.go("tab.registered");
    }
  })


// 注册页
.controller('RegisteredCtrl', function ($scope, $state, $interval, $ionicPopup, passData, $timeout) {
    $('title')[0].innerHTML='注册';
    $scope.description = "获取验证码";
    $scope.ban = true;  // 验证码输入框禁用
    var second=59;
    var timerHandler;
    var verification;
    // 获取验证码函数
    $scope.getTestCode = function () {
      $scope.ban = false;
      timerHandler = $interval(function () {
        if (second<=0) {
          $interval.cancel(timerHandler);
          second=59;
          $scope.description="获取验证码";
        }else{
          $scope.description=second+"秒后重发";
          second--;
        }
      },1000);
      verification = 888888;
    }

    // input 改变，按钮跟着改变
    $scope.submit = false;
    $scope.ipt = function (num) {
      $scope.submit = num;
    }

    $scope.loginuser = {
      phone:"",
      name:"",
      yzm:""
    };

    // 注册按钮函数 跳转首页
    $scope.doLogin = function (loginuser) {
      $scope.Testurl=TestBaseUrl+'user';
      console.log($scope.Testurl);
      var phone_yz = /^(13[0-9]|14[5|7]|15[0|1|2|3|5|6|7|8|9]|18[0|1|2|3|5|6|7|8|9])\d{8}$/;
      var name_yz = "";
      var yzm_yz = /^\d{6}$/;
      if (!loginuser.phone && !loginuser.name && !loginuser.yzm) {
        var myPopup = $ionicPopup.show({
          title:"输入不能为空"
        });
        $timeout(function() {
          myPopup.close(); // 3秒后关闭弹窗
        }, 2000);
      }else{
        if (!phone_yz.test(loginuser.phone)) {
          var myPopup = $ionicPopup.show({
            title:"手机号不正确"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 2000);
        }else if (!yzm_yz.test(loginuser.yzm)) {
          var myPopup = $ionicPopup.show({
            title:"验证码不正确"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 2000);
        }else if (loginuser.name == "") {
          var myPopup = $ionicPopup.show({
            title:"输入不能为空"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 2000);
        }else{
          if (loginuser.yzm == 888888) {
            passData.postJsonData(loginuser,$scope.Testurl).then(function (data) {
              if(data.code==200){
                $state.go("tab.theHal");
              }
            },function (err) {
              console.log(err);
              console.log("此手机号已注册");
            })
          } else {
            var myPopup = $ionicPopup.show({
              title:"测试：验证码请输入 888888 ！"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 2000);
          }
        }
      }
    }
  })


// 自动发包页
.controller('packageSettingCtrl', function ($scope,passData,$ionicPopup,$timeout,$state) {
    $('title')[0].innerHTML='自动发包';
    //自动发包机器人信息初始化
    $scope.robotData={
      roomID:'',
      minTime:0,
      maxTime:0,
      minMoney:0,
      maxMoney:0,
      minNumber:0,
      maxNumber:0,
      minMine:0,
      maxMine:0,
    }
    $scope.robotDataClose={
      "roomID":414 // 房间ID
    }
    $scope.maskPrompt=false;

    //房间ID
    $scope.nameModify=function(roomID){
      $scope.robotData.roomID=parseInt(roomID);
      $scope.robotDataClose.roomID=parseInt(roomID);
    }
    //发包时间
    $scope.timeEntry=function(timeMin,timeMax){
      $scope.robotData.minTime=parseInt(timeMin);
      $scope.robotData.maxTime=parseInt(timeMax);
    }
    //豆数范围
    $scope.beanRange=function(minMoney,maxMoney){
      $scope.robotData.minMoney=parseInt(minMoney);
      $scope.robotData.maxMoney=parseInt(maxMoney);
    }
    //包数范围
    $scope.modify=function(minParts,maxParts){
      $scope.robotData.minNumber=parseInt(minParts);
      $scope.robotData.maxNumber=parseInt(maxParts);
    }
    //炸弹范围
    $scope.BombEntry=function(BombMin,BombMax){
      $scope.robotData.minMine=parseInt(BombMin);
      $scope.robotData.maxMine=parseInt(BombMax);
    }


    $scope.isUsing=false;//关闭或开启
    $scope.determine = function (isUsing) {
      $scope.isUsing = isUsing;
    };
    //页面确定按钮
    $scope.settingSuc=function(data){
      if (isNaN(parseInt( $scope.robotData.roomID))) {
        var myPopup = $ionicPopup.show({
          template:"房间ID输入错误。"
        });
        $timeout(function() {
          myPopup.close();
        }, 1500);
      } else {
        if ($scope.isUsing) {
          if ($scope.robotData.minTime >= 1 && $scope.robotData.maxTime >= 1 && $scope.robotData.maxTime >= $scope.robotData.minTime) {
            if ($scope.robotData.minMoney >= 10 && $scope.robotData.maxMoney >= 10 && $scope.robotData.maxMoney >= $scope.robotData.minMoney) {
              if ($scope.robotData.minNumber >= 5 && $scope.robotData.maxNumber >= 5 && $scope.robotData.maxNumber >= $scope.robotData.minNumber) {
                if ($scope.robotData.minMine >= 1 && $scope.robotData.maxMine >= 1 && $scope.robotData.maxMine >= $scope.robotData.minMine && $scope.robotData.maxMine <= $scope.robotData.maxNumber) {
                  $scope.maskPrompt=data;
                } else {
                  var myPopup = $ionicPopup.show({
                    template:"炸弹范围设置错误,最小要大于等于1个,且后面的数要大于或等于前面的数,且小于等于最大包数。"
                  });
                  $timeout(function() {
                    myPopup.close();
                  }, 2000);
                }
              } else {
                var myPopup = $ionicPopup.show({
                  template:"包数范围设置错误,最小要大于等于5包,且后面的数要大于或等于前面的数。"
                });
                $timeout(function() {
                  myPopup.close();
                }, 2000);
                return;
              }
            } else {
              var myPopup = $ionicPopup.show({
                template:"豆数范围设置错误,最小要大于等于10豆,且后面的数要大于或等于前面的数。"
              });
              $timeout(function() {
                myPopup.close();
              }, 2000);
              return;
            }
          } else {
            var myPopup = $ionicPopup.show({
              template:"秒数范围设置错误,要大于等于1s,且后面的数要大于或等于前面的数。"
            });
            $timeout(function() {
              myPopup.close();
            }, 2000);
            return;
          }
        } else {
          $scope.maskPrompt=data;
        }
      }
    }

    //提交设置信息
    $scope.upload=function(){
      console.log($scope.isUsing);
      console.log($scope.robotData);
      console.log($scope.robotDataClose);
      if($scope.isUsing){
        passData.postJsonData($scope.robotData,TestBaseUrl+'robot/send').then(function (data) {
          if(data.code==200){
            $scope.maskPrompt=false;
              var myPopup = $ionicPopup.show({
                template:"设置成功"
              });
              $timeout(function() {
                myPopup.close();
              }, 1500);
          } else {
            var myPopup = $ionicPopup.show({
              template : "设置异常"
            });
            $timeout(function() {
              myPopup.close(); // 3秒后关闭弹窗
            }, 1000);
          }
        },function (err) {
          console.log(err);
          var myPopup = $ionicPopup.show({
            template : "设置失败"
          });
          $timeout(function() {
            myPopup.close(); // 3秒后关闭弹窗
          }, 1000);
        });
      }else{
        passData.putJsonData($scope.robotDataClose,TestBaseUrl+'robot/send').then(function (data) {
          if(data.code==200){
            $scope.maskPrompt=false;
              var myPopup = $ionicPopup.show({
                template:"已关闭"
              });
              $timeout(function() {
                myPopup.close();
              }, 1500);
          } else {
            $scope.maskPrompt=false;
            var myPopup = $ionicPopup.show({
              template:"关闭异常"
            });
            $timeout(function() {
              myPopup.close();
            }, 1500);
          }
        },function (err) {
          console.log(err);
          var myPopup = $ionicPopup.show({
            template:"关闭失败"
          });
          $timeout(function() {
            myPopup.close();
          }, 1500);
        });
        $scope.maskPrompt = false;
      }
    }
  })


// 修改页
.controller('XiuGaiCtrl', function ($scope,passData,$ionicPopup,$timeout,$state) {
    $('title')[0].innerHTML='修改页';
  // tab 切换
  $scope.according = 0;
  $scope.showHidden = function (num) {
    $scope.according = num;
    if (num == 0) {
      $scope.doRefresh1();
    } else if (num == 1) {
      $scope.doRefresh();
    } else {
      $scope.RateData.users = [];
      $scope.theRoomId2 = "";
      document.getElementById("rate_search").value = "";
    }
  }

  //  充值钻石 -------------------
  $scope.user = ""; // 搜索字符
  $scope.userLists1 = []; // 搜索到的数据
  $scope.checkUser = ""; // 勾选的用户
  $scope.beans = "";  // 钻石
  $scope.recharge = {
    "userID" : "",
    "money" : ""
  }; // 要充钻石的用户
  // 过滤用户列表
  $scope.filter = function (user) {
    $scope.filterUrl = TestBaseUrl + "username_list?key=" +  user;
    passData.getData($scope.filterUrl).then(function(suc){
      if(suc.code==200){
        // 房间数据
        $scope.userLists1 = suc.data;
        // console.log($scope.userLists1);
      } else {
        var myPopup = $ionicPopup.show({
          template:"获取数据异常"
        });
        $timeout(function() {
          myPopup.close();
        }, 1500);
      }
    },function(err){
      console.log(err);
      var myPopup = $ionicPopup.show({
        template:"获取数据失败"
      });
      $timeout(function() {
        myPopup.close();
      }, 1500);
    })
  }
  $scope.filter($scope.user);
  // 下拉刷新
  $scope.doRefresh1 = function () {
    $scope.user = "";
    document.getElementById('imitation_search').value = "";
    $scope.filter($scope.user);
    $scope.$broadcast('scroll.refreshComplete');
  }
  // 选择需要充值的用户
  $scope.qieHuan1=function(userList,beans){
    console.log(userList);
    $scope.checkUser = userList;
    $scope.recharge.userID = $scope.checkUser.id;
    $scope.recharge.money = "";
    $scope.beans = beans;  // 钻石
    for(var i=0;i<document.getElementsByClassName('imitation_input').length;i++){
      if(document.getElementsByClassName('checkBooles')[i].checked){
        $scope.userLists1[i].boole=true;
      }else{
        $scope.userLists1[i].boole=false;
      };
      if (document.getElementsByClassName('imitation_input')[i].disable == true) {
        document.getElementsByClassName('imitation_input')[i].value = $scope.beans;
      } else {
        document.getElementsByClassName('imitation_input')[i].value = "";
      }
    };
    $scope.beans = "";  // 钻石
  }
  //输入框输入内容时逻辑判断
  $scope.changes = function(bean){
    if (bean < 0) {
      var myPopup = $ionicPopup.show({
        template:"请输入正整数!!!"
      });
      $timeout(function() {
        myPopup.close();
      }, 1500);
      return;
    }
    $scope.recharge.money = parseInt(bean);
  }
  // 提示遮罩的显示隐藏
  $scope.maskPrompt = false;
  $scope.hiddenDisplay = function (bool) {
    console.log($scope.recharge);
    if($scope.recharge.userID == "") {
      var myPopup = $ionicPopup.show({
        template:"请勾选充值的用户"
      });
      $timeout(function() {
        myPopup.close();
      }, 2000);
      return;
    } else if($scope.recharge.money == "") {
      var myPopup = $ionicPopup.show({
        template:"请输入充值的钻石数量"
      });
      $timeout(function() {
        myPopup.close();
      }, 2000);
    } else {
      $scope.maskPrompt = bool;
    }
  }
  $scope.displayNone = function () {
    $scope.maskPrompt = false;
  }
  // 提交用户ID和money给后台
  $scope.upload = function () {
    console.log($scope.recharge);
    $scope.maskPrompt = false;
    passData.postJsonData($scope.recharge,TestBaseUrl+'recharge').then(function (data) {
      if(data.code==200){
        var myPopup = $ionicPopup.show({
          template:"充值成功"
        });
        $timeout(function() {
          myPopup.close();
        }, 1500);
      }else{
        var myPopup = $ionicPopup.show({
          template:"你无该权限"
        });
        $timeout(function() {
          myPopup.close();
        }, 1500);
      };
    },function (err) {
      console.log(err);
      var myPopup = $ionicPopup.show({
        template:"请求异常"
      });
      $timeout(function() {
        myPopup.close();
      }, 1500);
    });
    $scope.user = ""; // 搜索字符
    $scope.recharge = {
      "userID" : "",
      "money" : ""
    };
    $scope.beans = "";  // 钻石
    document.getElementById('imitation_search').value = "";
    $scope.filter($scope.user);
  }

  // 房间概率 -----------------
  $scope.theRoomId1 = ""; // 房间列表搜索关键字
  $scope.userLists = []; // 搜索到的数据
  $scope.checkUser = ""; // 勾选的用户
  $scope.rateurl=TestBaseUrl+'rooms/rate'; // 获取房间数据地址
  $scope.rateData= {"rate": 0 };// 中雷概率
  $scope.idData = {"id" : ""};
  //获取概率列表
  $scope.probabilityData = function () {
    passData.getData($scope.rateurl).then(function(suc){
      if(suc.code==200){
        // console.log(suc);
        $scope.userLists = suc.data;
      } else {
        var myPopup = $ionicPopup.show({
          template:"获取数据异常"
        });
        $timeout(function() {
          myPopup.close();
        }, 1500);
      }
    },function(err){
      console.log(err);
      var myPopup = $ionicPopup.show({
        template:"获取数据失败"
      });
      $timeout(function() {
        myPopup.close();
      }, 1500);
    })
  };
  $scope.probabilityData();
  // 下拉刷新
  $scope.doRefresh = function () {
    $scope.probabilityData();
    $scope.$broadcast('scroll.refreshComplete');
    document.getElementsByClassName('checkBooles1').checked = false;
    $scope.theRoomId1 = ""; // 房间列表搜索关键字
  }
  // 选择需要充值的用户
  $scope.qieHuan=function(userList){
    console.log(userList);
    $scope.checkUser = userList;
    $scope.idData.id = $scope.checkUser.id;
    for(var i=0;i<document.getElementsByClassName('probability_input').length;i++){
      if(document.getElementsByClassName('checkBooles1')[i].checked){
        $scope.userLists[i].boole=true;
      }else{
        $scope.userLists[i].boole=false;
      };
    };
  }
  //输入框输入内容时逻辑判断
  $scope.changes1 = function(bean){
    $scope.rateData.rate = parseInt(bean);
    console.log($scope.rateData);
  }
  // 提示遮罩的显示隐藏
  $scope.maskPrompt1 = false;
  $scope.hiddenDisplay1 = function (bool) {
    console.log($scope.rateData);
    if($scope.idData.id == "") {
      var myPopup = $ionicPopup.show({
        template:"请勾选充值的用户"
      });
      $timeout(function() {
        myPopup.close();
      }, 1500);
    } else if (isNaN(parseInt($scope.rateData.rate))) {
      var myPopup = $ionicPopup.show({
        template:"请输入概率的值"
      });
      $timeout(function() {
        myPopup.close();
      }, 1500);
    } else {
      $scope.maskPrompt1 = bool;
    }
  }
  $scope.displayNone1 = function () {
    $scope.maskPrompt1 = false;
  }
  // 提交房间概率给后台
  $scope.upload1 = function () {
    $scope.maskPrompt1 = false;
    //设置房间中包概率
    // $scope.rateData = $scope.checkUser.rate;
    passData.putJsonData( $scope.rateData ,TestBaseUrl + "rooms/"+$scope.checkUser.id+"/rate").then(function (data) {
      console.log(data);
      if(data.code==200){
        var myPopup = $ionicPopup.show({
          template:"设置成功"
        });
        $timeout(function() {
          myPopup.close();
        }, 1500);
      } else {
        var myPopup = $ionicPopup.show({
          template:"设置概率异常"
        });
        $timeout(function() {
          myPopup.close();
        }, 1500);
      }
      $scope.probabilityData(); // 重新获取房间数据
    },function (err) {
      console.log(err);
      var myPopup = $ionicPopup.show({
        template:"设置概率失败"
      });
      $timeout(function() {
        myPopup.close();
      }, 1500);
    });
    $scope.idData = {
      "id" : ""
    }
    $scope.rateData = {
      "rate" : ""
    };
    document.getElementsByClassName('checkBooles1').checked = false;
    $scope.theRoomId1 = ""; // 房间列表搜索关键字
    // document.getElementsByClassName('imitation_input').disabled = false;
  }
  //  概率加减
  $scope.reduce1 = function (index) {
    $scope.userLists[index].rate --;
    $scope.rateData.rate = $scope.userLists[index].rate;
    //console.log($scope.rateData);
  };
  $scope.add1 = function (index) {
    $scope.userLists[index].rate ++;
    $scope.rateData.rate = $scope.userLists[index].rate;
    //console.log($scope.rateData);
  };

  // 个人概率页 -----------------
  //自动发包机器人信息初始化
  $scope.RateData={
    "users":[
    ]
  }
  $scope.theRoomId2 = ""; // 房间Id
  $scope.roomdata = function (theRoomId2) {
    $scope.theRoomId2 = parseInt(theRoomId2);
  }
  $scope.userRate=function(theRoomId2){
    $scope.theRoomId2 = parseInt(theRoomId2);
    passData.getData(TestBaseUrl + "room/"+theRoomId2+"/user_rate").then(function(suc){
      if(suc.code==200){
        $scope.RateData.users=suc.data;
      } else {
        var myPopup = $ionicPopup.show({
          template:"获取数据异常"
        });
        $timeout(function() {
          myPopup.close();
        }, 1500);
      }
    },function(err){
      console.log(err);
      var myPopup = $ionicPopup.show({
        template:"获取数据失败"
      });
      $timeout(function() {
        myPopup.close();
      }, 1500);
    })
  }
  // 增加用户
  $scope.addUser = function () {
    $scope.RateData.users.push({
      "userID": "",
      "rate": 0   // 个人概率
    });
    // console.log($scope.RateData.users);
  }
  $scope.changes2 = function ($index,num) {
    $scope.RateData.users[$index].rate = parseInt(num);
    // console.log($scope.RateData.users);
  }
  $scope.numbers = function ($index,num) {
    $scope.RateData.users[$index].userID = parseInt(num);
    // console.log($scope.RateData.users);
  }
  // 显示隐藏弹窗
  $scope.maskPrompt2 = false;
  $scope.hiddenDisplay2=function(bool){
    var datas = $scope.RateData.users;
    var num = 0;
    if ( isNaN(parseInt($scope.theRoomId2))) {
      var myPopup = $ionicPopup.show({
        template:"请先搜索房间。"
      });
      $timeout(function() {
        myPopup.close();
      }, 1500);
    } else {
      for (var i = 0; i < datas.length; i ++) {
        if (isNaN(parseInt(datas[i].userID))) {
          num ++
        } else {
          if (isNaN(parseInt(datas[i].rate))) {
            num ++
          }
        }
      }
      if (num > 0) {
        var myPopup = $ionicPopup.show({
          template:"输入错误。"
        });
        $timeout(function() {
          myPopup.close();
        }, 1500);
        num = 0;
      } else {
        $scope.maskPrompt2 = bool;
      }
    }
    console.log($scope.RateData.users)
  }
  $scope.displayNone2 = function () {
    $scope.maskPrompt2 = false;
  }
  $scope.reduce = function ($index) {
    $scope.RateData.users[$index].rate --;
    // console.log($scope.RateData.users)
  }
  $scope.add = function ($index) {
    $scope.RateData.users[$index].rate ++;
    // console.log($scope.RateData.users)
  }
  // 删除设置
  $scope.deleteUser = function ($index) {
    $scope.RateData.users.splice($index,1);
    // console.log($scope.RateData.users)
  }
  //上次设置成功的概率
  $scope.upRate=function(){
    passData.putJsonData( $scope.RateData ,TestBaseUrl + "rooms/"+$scope.theRoomId2+"/user_rate").then(function (data) {
      console.log(data);
      if(data.code==200){
        $scope.maskPrompt2=false;
      };
    },function (err) {
      console.log(err);
      var myPopup = $ionicPopup.show({
        template:"设置失败"
      });
      $timeout(function() {
        myPopup.close();
      }, 1500);
    });
    $scope.RateData.users = [];
    $scope.theRoomId2 = "";
    document.getElementById("rate_search").value = "";
  }

  })
