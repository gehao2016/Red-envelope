angular.module('starter.services', [])

  .factory('locals',['$window',function ($window) {
    return {
      //存储单个的属性
      set:function (key,value) {
        $window.localStorage[key] = value;
      },
      //读取单个属性
      get:function (key,defaultvalue) {
        return  $window.localStorage[key] || defaultvalue;
      }
    }
  }])


  //房间记录数据
  .factory('packageDetails',function () {
    var datas = [
      {
        id : 0,
        portrait : "images/touxiang02.png",
        nickname : "我心依旧",
        date : "03-26",
        times : "14:33",
        money : 20,
        room : "011"
      },
      {
        id : 1,
        portrait : "images/touxiang02.png",
        nickname : "我心依旧",
        date : "03-26",
        times : "14:33",
        money : 20,
        room : "011"
      },
      {
        id : 2,
        portrait : "images/touxiang02.png",
        nickname : "我心依旧",
        date : "03-26",
        times : "14:33",
        money : 20,
        room : "011"
      },
      {
        id : 3,
        portrait : "images/touxiang02.png",
        nickname : "我心依旧",
        date : "03-26",
        times : "14:33",
        money : 20,
        room : "011"
      },
      {
        id : 4,
        portrait : "images/touxiang02.png",
        nickname : "我心依旧",
        date : "03-26",
        times : "14:33",
        money : 20,
        room : "011"
      }
    ];
    return{
      all:function(){
        return datas;
      }
    }
  })


  //webSocket链接
  .factory('webSocket',function($state){
    //var parameter=window.location.href.split('?')[1];
    //if(parameter){
    //  localStorage.setItem('roomId',parameter.split('=')[1].split('&')[0]);//获取分享网页的roomId号,并储存
    //}
    //
    //roomId=localStorage.getItem('roomId');
    //if(localStorage.getItem('personalInf')){
    //  userID=JSON.parse(localStorage.getItem('personalInf')).id
    //  var uid=JSON.parse(localStorage.getItem('personalInf'));
    //  var urlRequest=url+roomId+'&key='+uid.key;
    //}else{
    //  $state.go('tab.theHal');
    //}
    //console.log(urlRequest);
    //var socket;
    ////实现化WebSocket对象，指定要连接的服务器地址与端口
    //socket = new WebSocket(urlRequest);
    //
    ////打开事件
    //socket.onopen = function() {
    //  console.log("Socket 已打开");
    //  //socket.send("这是来自客户端的消息" + location.href + new Date());
    //};
    //
    ////关闭事件
    //socket.onclose = function() {
    //  console.log("Socket已关闭");
    //};
    ////发生了错误事件
    //socket.onerror = function() {
    //  console.log("发生了错误");
    //}
    var isJson=function (str) {
      if (typeof str == 'string') {
        try {
          var obj=JSON.parse(str);
          if(typeof obj == 'object' && obj ){
            return true;
          }else{
            return false;
          }
        } catch(e) {
          console.log('error：'+str+'!!!'+e);
          return false;
        }
      }
    }
    return {
      //socket:socket,
      isJson:isJson
    };
  })


// post,get
  .factory('passData',[ "$http", "$q", "$state", "$location" ,function ($http, $q, $state, $location) {

    var sucBack = function (res, url) {
      console.log("数据：" + res);
      console.log("地址：" + url);
    }

    var errBack = function (err) {
      console.log(err);
    }

    var postData = function (data, url) {
      var deffered = $q.defer();
      $http({
        method: 'POST',
        url:url,
        data:data
      }).success(function (res) {
        console.log(res);
        deffered.resolve(res);
      }).error(function (err) {
        console.log(err);
        deffered.reject(err);
      })
      return deffered.promise;
    }

    var getData = function (url) {
      var deffered = $q.defer();
      $http({
        method: 'GET',
        url: url,
      }).success(function (res) {
        // console.log(res);
        deffered.resolve(res);
      }).error(function (err) {
        //console.log(err);
        deffered.reject(err);
      })
      return deffered.promise;
    }

    var postJsonData = function (data, url) {
      var deffered = $q.defer();
      $http({
        method: "POST",
        url: url,
        data: JSON.stringify(data)
      }).success(function (res) {
        // console.log(res);
        deffered.resolve(res);
      }).error(function (err) {
        console.log(err);
        deffered.reject(err);
      })
      return deffered.promise;
    }
    var putJsonData = function (data, url) {
      var deffered = $q.defer();
      $http({
        method: "PUT",
        url: url,
        data: JSON.stringify(data)
      }).success(function (res) {
        // console.log(res);
        deffered.resolve(res);
      }).error(function (err) {
        console.log(err);
        deffered.reject(err);
      })
      return deffered.promise;
    }
  return{
    postData:postData,
    getData:getData,
    postJsonData:postJsonData,
    putJsonData:putJsonData
  }
  }])

// 判断用户是否登录
  .factory('theUser',["$state",function ($state) {
    var user = function () {
      if (!JSON.parse(localStorage.getItem('personalInf'))) {
        $state.go("tab.login");
      }
    }
    return{
      user:user
    }
}])

  .factory('PagePosition', function() {
   var _top;
   // var _left = 0;

   return {
     getPosition: function () {
       return _top;
     },
     setPosition: function (top) {
       // console.log(top);
       _top = top;
       // _left = left;
     }
   }
  })

