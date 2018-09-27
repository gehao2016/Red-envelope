// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
//声明url地址
//var TestBaseUrl= 'http://192.168.43.101:2024/';//本地服务器网址
var TestBaseUrl='http://g.tonghejianzhu.com/';//正式环境地址
var TestBaseUrlone = 'http://g.tonghejianzhu.com';//获取头像网址
var chatRecordData=[];//聊天记录全局保存
var chatfragment=[];//聊天记录片段保存
var selfData={};//自己豆包存一下
var hongBaoOBJ={};//豆包对象信息
var Identification=0;
//全局变量
if (localStorage.getItem('personalInf')) {
  var personalInf = localStorage.getItem('personalInf');  // 登录个人信息 data
} else {
   // window.location.href = "#/tab/login";
}
var scrollTop='';
var scrollHeight='';
var socket;//声明webSocket
//var url='ws://192.168.43.88:8090/ws?roomID=';//本地服务器网址
var url='ws://g.tonghejianzhu.com/ws?roomID=';//正式环境地址/
var userID=''//用户Id
var roomId='';//房间id

angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'starter.directive', 'ngTouch'])

.run([ '$ionicPlatform', '$ionicPopup', '$rootScope', '$location', '$ionicHistory', function($ionicPlatform, $ionicPopup, $rootScope, $location, $ionicHistory, $state) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });

  // ****************************************************************************
  // 返回到主页面时按退出键判断是否退出APP
  $ionicPlatform.registerBackButtonAction(function (e){
    //阻止默认的行为
    e.preventDefault();
    // 退出提示框
    function showConfirm() {
      var servicePopup = $ionicPopup.show({
        title: '提示',
        subTitle: '你确定要退出应用吗？',
        scope: $rootScope,
        buttons: [
          {
            text: '取消',
            type: 'button-clear button-assertive',
            onTap: function () {
              return 'cancel';
            }
          },
          {
            text: '确认',
            type: 'button-clear button-assertive border-left',
            onTap: function (e) {
              return 'active';
            }
          },
        ]
      });
      servicePopup.then(function (res) {
        if (res == 'active') {
          // 退出app
          ionic.Platform.exitApp();
        }
      });
    }
    // 判断当前路由是否为各个导航栏的首页，是的话则显示提示框
    if ($location.path() == '/tab/theHal' || $location.path() == '/tab/margie' || $location.path() == '/tab/account') {
      if ($rootScope.backButtonPressedOnceToExit) {
        showConfirm()
      }else {
        $rootScope.backButtonPressedOnceToExit = true;
        setTimeout(function () {
          $rootScope.backButtonPressedOnceToExit = false;
        },2000);
      }
    } else if ($ionicHistory.backView()) {
      $ionicHistory.goBack();
    } else {
      $rootScope.backButtonPressedOnceToExit = true;
      setTimeout(function () {
        $rootScope.backButtonPressedOnceToExit = false;
      },2000);
    }
    $ionicHistory.backView.go();
    e.preventDefault();
    return false;
  }, 101); //101优先级常用于覆盖‘返回上一个页面'的默认行为

}])

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
	//添加内容位置
   /*用于修改安卓tab居下 （在参数里要加入$ionicConfigProvider）*/
    $ionicConfigProvider.platform.ios.tabs.style('standard');
    $ionicConfigProvider.platform.ios.tabs.position('bottom');
    $ionicConfigProvider.platform.android.tabs.style('standard');
    $ionicConfigProvider.platform.android.tabs.position('standard');

    $ionicConfigProvider.platform.ios.navBar.alignTitle('center');
    $ionicConfigProvider.platform.android.navBar.alignTitle('left');

    $ionicConfigProvider.platform.ios.backButton.previousTitleText('').icon('ion-ios-arrow-thin-left');
    $ionicConfigProvider.platform.android.backButton.previousTitleText('').icon('ion-android-arrow-back');

    $ionicConfigProvider.platform.ios.views.transition('ios');
    $ionicConfigProvider.platform.android.views.transition('android');
    /*用于修改安卓tab居下 --结束*/


  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
    .state('tab', {
    url: '/tab',
    cache: false,//不缓存
    abstract: true,
    templateUrl: 'templates/tabs.html'
  })

  // Each tab has its own nav history stack:

    // 大厅页
  .state('tab.theHal', {
    url: '/theHal',
    views: {
      'tab-theHal': {
        templateUrl: 'templates/tab-theHal.html',
        controller: 'TheHalCtrl'
      }
    }
  })


    // 创建房间页
  .state('tab.margie', {
      url: '/margie',
      views: {
        'tab-margie': {
          templateUrl: 'templates/tab-margie.html',
          controller: 'MargieCtrl'
        }
      }
    })


    // 我的个人页
  .state('tab.account', {
    url: '/account',
    views: {
      'tab-account': {
        templateUrl: 'templates/tab-account.html',
        controller: 'AccountCtrl'
      }
    }
  })


  // 房间记录页
    .state('tab.roomRecord', {
      url: '/roomRecord',
      views: {
        'tab-account': {
          templateUrl: 'templates/tab-roomRecord.html',
          controller: 'RoomRecordCtrl'
        }
      }
    })

    // 充值页
    .state('tab.topUp', {
      url: '/topUp',
      views: {
        'tab-account': {
          templateUrl: 'templates/tab-topUp.html',
          controller: 'TopUpCtrl'
        }
      }
    })

    // 房间页
    .state('tab.theRoom', {
      url: '/theRoom?roomId',
      views: {
        'tab-theHal': {
          cache: true,//缓存
          templateUrl: 'templates/tab-theRoom.html?roomId',
          controller: 'TheRoomCtrl'
        }
      }
    })


    // 登录页
    .state('tab.login', {
      url: '/login',
      views: {
        'tab-theHal': {
          templateUrl: 'templates/tab-login.html',
          controller: 'LoginCtrl'
        }
      }
    })


    // 注册页
    .state('tab.registered', {
      url: '/registered',
      views: {
        'tab-theHal': {
          templateUrl: 'templates/tab-registered.html',
          controller: 'RegisteredCtrl'
        }
      }
    })

    // 红包页
    .state('tab.redPackets', {
      url: '/redPackets',
      views: {
        'tab-theHal': {
          cache: false,//不缓存
          templateUrl: 'templates/tab-redPackets.html',
          controller: 'RedPacketsCtrl'
        }
      }
    })

    // 机器人页
      .state('tab.robotPage', {
      url: '/robotPage',
      views: {
        'tab-theHal': {
          templateUrl: 'templates/tab-robotPage.html',
          controller: 'RobotPageCtrl'
        }
      }
    })

      // 中包记录页
    .state('tab.mediumPacketRecord', {
      url: '/mediumPacketRecord',
      views: {
        'tab-theHal': {
          templateUrl: 'templates/tab-mediumPacketRecord.html',
          controller: 'MediumPacketRecordCtrl'
        }
      }
    })

    // 聊天记录页
    .state('tab.chatRecord', {
      url: '/chatRecord',
      views: {
        'tab-theHal': {
          templateUrl: 'templates/tab-chatRecord.html',
          controller: 'ChatRecordCtrl'
        }
      }
    })

    // 红包详情页
    .state('tab.packageDetails', {
      params:{"redEnvelopID":null},
      url: '/packageDetails',
      views: {
        'tab-theHal': {
          templateUrl: 'templates/tab-packageDetails.html',
          controller: 'PackageDetailsCtrl'
        }
      }
    })

    // 联系客服页
    .state('tab.customer', {
      url: '/customer',
      views: {
        'tab-account': {
          templateUrl: 'templates/tab-customer.html',
          controller: 'CustomerCtrl'
        }
      }
    })

    // 修改页面
    .state('tab.xiuGai', {
      url: '/xiuGai',
      views: {
        'tab-account': {
          templateUrl: 'templates/tab-xiuGai.html',
          controller: 'XiuGaiCtrl'
        }
      }
    })

    // 设置小号自动发包
    .state('tab.packageSetting', {
      url: '/packageSetting',
      views: {
        'tab-account': {
          templateUrl: 'templates/tab-packageSetting.html',
          controller: 'packageSettingCtrl'
        }
      }
    })

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/theHal');

});
