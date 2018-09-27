var cityData=[
    {"id":"01","name":"8小时","shortName":"1"},
    {"id":"02","name":"16小时","shortName":"2"},
    {"id":"03","name":"24小时","shortName":"3"},
    {"id":"04","name":"32小时","shortName":"4"},
    {"id":"05","name":"40小时","shortName":"5"},
    {"id":"06","name":"48小时","shortName":"6"},
    {"id":"07","name":"56小时","shortName":"7"},
    {"id":"08","name":"64小时","shortName":"8"},
    {"id":"09","name":"72小时","shortName":"9"},
    {"id":"10","name":"80小时","shortName":"10"},
    {"id":"11","name":"88小时","shortName":"11"}];
(function(){
    var data = [],data2 = [];
    cityData = JSON.stringify(cityData).replace(/\"id\":/g, "\"value\":");
    cityData=JSON.parse(cityData);
    for (var i = 0,length = cityData.length; i < length; i++) {
        data.push(cityData[i]);
    };

    window.dataJson = data;
})();

