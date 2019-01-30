var _workers = null;
var _taskId = 0;
var _tasks = null;

var LoadWorker = {
    support: (typeof window === 'undefined' ? global : window).Worker,
	
	maxNum: 4,
	
    init: function () {
        if (!this.support) return;
        _tasks = {};
		_workers && _workers.forEach(worker => worker.terminate());
		_workers = [];
		for (var i = 0; i < this.maxNum; i ++) {
			var _worker = new Worker('worker.js');
			_worker.onmessage = function (e) {
				var taskId = e.data[0];
				var parameters = e.data[1];
				if (parameters[0]) parameters[0] = new Error(parameters[0]);
				var onComplete = _tasks[taskId];
				delete _tasks[taskId];
				onComplete && onComplete.apply(this, parameters);
			}
			_workers.push(_worker);
		}

    },

    

    startTask: function (task, paramters, transferData, onComplete) {
        var id = _taskId++;
        var task = task;
        var parameters = paramters || [];
        var onComplete = onComplete; 
        _tasks[id] = onComplete;
        transferData ? _workers[id % this.maxNum].postMessage([id, task, parameters], transferData) : _workers[id % this.maxNum].postMessage([id, task, parameters]);
    },

    TaskType: {
        DECODE_PNG: 1,
        DECODE_JPG: 2
    }
    
};