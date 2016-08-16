const webdriver = require('selenium-webdriver');
const debug = require('./debug.js')(true);
const cluster = require('cluster');
const redis = require('redis');
const redisClient = redis.createClient();

var url = "http://localhost";

const threads = 2;

function main() {
    if (cluster.isMaster) {

        redisClient.on('connect', function() {
            debug.log('[master] Redis connected');
            redisClient.set('counter', 0);

            for (var i = 0; i < threads; i++) {
                var worker = cluster.fork();
            }

        });

        cluster.on('exit', (worker, code, signal) => {
            cluster.fork();
        });

        cluster.on('fork', function(worker) {
            debug.log('[master] ' + 'fork: worker' + worker.id);    
            worker.send(url);    
        });

        cluster.on('message', function(message) {
            console.log(message);    
        });

    } else if (cluster.isWorker) {
        process.on('message', function(message) {
            proceedURL(url, function() {
                cluster.worker.kill();
            });
        });
    }
}

function proceedURL(url, callback) {
    debug.log('[worker] Open:' + url);
    capabilities = {
      'browser' : 'chrome',
      'browserName' : 'chrome',
      'os' : 'Windows',
      'os_version' : '10',
      'resolution' : '1280x1024'
    }
    
    var driver = new webdriver.Builder()
        //change your selenium server URL
        .usingServer('http://192.168.89.1:4444/wd/hub')
        .withCapabilities(capabilities)
        .build();
    driver.manage().deleteAllCookies().then(function(obj) {
        debug.log('[worker] Cache Clear');
    }).then(function(obj) {
        debug.log('[worker] Maximize browser');
        driver.manage().window().maximize();
    }).then(function(obj) {
        driver.get(url);
    });

    driver.getTitle().then(function(title) {
        console.log(title);
    }).then(function() {
        redisClient.incr("counter");
        debug.log('[worker] Start sleep');
        driver.sleep(5000);
        driver.manage().deleteAllCookies().then(function() {
            driver.close().then(function() {
                callback(false, true);
            });
        });
    });
}

main();