angular.module('starter.directive', [])
/*去掉下面的tabs代码*/
.directive("hideTabs", function($rootScope) {
  return {
    restrict: "A",
    link: function(scope, element, attributes) {
      scope.$on("$ionicView.beforeEnter", function() {
        scope.$watch(attributes.hideTabs,function (value) {
          $rootScope.hideTabs = 'tabs-item-hide';
        });
      });
      scope.$on("$ionicView.beforeLeave", function() {
        scope.$watch(attributes.hideTabs,function (value) {
          $rootScope.hideTabs = 'tabs-item-hide';
        });
        scope.$watch('$destroy',function () {
          $rootScope.hideTabs = false;
        })
      });
    }
  };
})


//  红包
.directive("redPacket", function () {
    return {
      restrict: 'E',
      templateUrl:"tempHtml/redEnvelopes.html",
      replace: true
    };
  })




