var fs = require('node-fs');
var Warehouse = require('./warehouse');
var Order = require('./order');
var lines;

var config = {
    productWeights: [],
    warehouses: [],
    ordersArray: []
};



module.exports.import = function(file) {
    var inputSet = fs.readFileSync(file, 'utf8');

    lines = inputSet.split('\n');

    var currentWarehouse;
    var currentOrder;
    var orderCount = 0;

    for (var i = 0; i < lines.length; i++ ) {

        var line = lines[i].split(' ');
        if (i == 0) {
            config.rows = line[0];
            config.columns = line[1];
            config.drones = line[2];
            config.turns = line[3];
            config.payload = line[4];
        }

        if (i == 2) {
            line.forEach(function(weight, j) {
                config.productWeights[j] = weight;
            });
        }

        if (i == 3) {
            config.numberOfWarehouses = line[0];
        }

        if (i >= 4 && i < config.numberOfWarehouses * 2 + 4) {
            if (i % 2 == 0) {
                currentWarehouse = new Warehouse();
                currentWarehouse.coordinates = line;

            } else {
                line.forEach(function(productCount, productId) {
                    currentWarehouse.products[productId] = productCount;
                });
                config.warehouses.push(currentWarehouse);
            }
        }

        if (i > config.numberOfWarehouses * 2 + 4) {

            if (orderCount % 3 == 0) {
                currentOrder = new Order();
                currentOrder.coordinates = line;
            }

            if (orderCount % 3 == 2) {
                config.ordersArray.push(currentOrder);
                currentOrder.products = sortByProductWeight(line);
            }

            orderCount++;
        }
    };

    return config;
};

function sortByProductWeight(productTypes) {
    return productTypes.sort(function (a, b) {
        return config.productWeights[a] - config.productWeights[b];
    });
}