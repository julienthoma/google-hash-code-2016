var fs = require('node-fs');
var _ = require('underscore');
var Helper = require('./helper');

module.exports.writeCommands = function(commands, fileName) {
    var content = commands.length + '\n';

    commands.forEach(function(command, i) {
        content += command;

        if (i !== commands.length - 1) {
            content += '\n';
        }
    });

    fs.writeFileSync('./data/' + fileName + '.out', content, 'utf8');
};


module.exports.findNearestWareHouse = function(config, coordinates) {
    var nearestWareHouse = null;
    var closestDistance = Number.MAX_VALUE;

    config.warehouses.forEach(function(warehouse) {
        var currentDistance = distance(warehouse.coordinates, coordinates);

        if (currentDistance < closestDistance) {
            closestDistance = currentDistance;
            nearestWareHouse = warehouse;
        }
    });

    return nearestWareHouse;
};

module.exports.findSmallestNotFinishedOrder = function(config) {
    var smallestSize = Number.MAX_VALUE;
    var smallestOrder = null;

    _.each(config.orders, function(order) {
        if (!order.isComplete && order.products.length < smallestSize) {
            smallestOrder = order;
            smallestSize = order.products.length;
        }
    });

    return smallestOrder;
};

module.exports.getNextDeliveryPlan = function(config, order) {
    var smallestDistance = Number.MAX_VALUE;
    var deliveryPlan = {
        warehouse: null,
        products: [],
        order: order,
        weight: null,
        additionalOrders: []
    };

    var weight = 0;

    // TODO: Hier könnte man alle knapsackproblem die beste combo finden die rein passt. statt nach gewicht zu sortieren.
    while (order.products.length > 0) {
        var nextProductId = order.products[0];
        var currentProductWeight = Helper.getProductWeight(config, nextProductId);

        if (weight + currentProductWeight <= config.payload) {
            weight += currentProductWeight;
            deliveryPlan.products.push(order.products.shift());
        } else {
            break;
        }
    };

    deliveryPlan.products = Helper.productArrayToObject(deliveryPlan.products);

    if (order.products.length == 0) {
        console.log('set is complete');
        order.isComplete = true;
    }

    config.drones.forEach(function(drone) {
        config.warehouses.forEach(function(warehouse) {
            if (!warehouse.hasProductsInStock(deliveryPlan.products)) {
                return;
            }

            var warehouseDroneDistance = distance(warehouse.coordinates, drone.getCoordinates());
            var warehouseOrderDistance = distance(warehouse.coordinates, order.coordinates);
            var totalDistance = warehouseDroneDistance + warehouseOrderDistance;
            var neededTurns = totalDistance + 2 * Object.keys(deliveryPlan.products).length;

            if (neededTurns > drone.getTurns()) {
                return
            }

            if (totalDistance < smallestDistance) {

                smallestDistance = totalDistance;
                deliveryPlan.drone = drone;
                deliveryPlan.warehouse = warehouse;
                deliveryPlan.needTurns = neededTurns;
                deliveryPlan.turnsLeft = drone.getTurns() - neededTurns;
            }
        });
    });

    // TODO: Solange nicht behandelt skippen.
    if (!deliveryPlan.warehouse) {
        console.log('no warehouse');

        return deliveryPlan;
    }

    deliveryPlan.warehouse.removeProducts(deliveryPlan.products);

    deliveryPlan.weight = weight;
    deliveryPlan.distance = smallestDistance;

    var loadFactor = weight / config.payload;

    //if (loadFactor < 0.5 ) {
    //    Helper.addNearestCompletableOrder(config, deliveryPlan);
    //    console.log(deliveryPlan.additionalOrders);
    //}

    return deliveryPlan;
};

module.exports.addNearestCompletableOrder = function(config, deliveryPlan) {



    var smallestDistance = Number.MAX_VALUE;
    var bestOrder = null;

    var remainingWeight = config.payload - deliveryPlan.weight;

    _.each(config.orders, function(order) {
        if (order.isComplete) {
            return;
        }

        var productObj = Helper.productArrayToObject(order.products);

        if (!deliveryPlan.warehouse.hasProductsInStock(productObj)) {
            return;
        }

        var orderWeight = Helper.getProductsWeight(config, productObj);

        if (orderWeight > remainingWeight) {
            return;
        }

        var orderToOrderDistance = distance(deliveryPlan.order.coordinates, order.coordinates);
        var neededTurns = orderToOrderDistance + 2 * Object.keys(productObj).length;


        if (neededTurns > deliveryPlan.turnsLeft) {
            return;
        }

        deliveryPlan.turnsLeft -= neededTurns;
        deliveryPlan.needTurns += neededTurns;

        if (orderToOrderDistance < smallestDistance) {
            smallestDistance = orderToOrderDistance;
            bestOrder = order;
        }
    });

    if (bestOrder) {
        deliveryPlan.additionalOrders.push(bestOrder);
    } else {
        return false;
    }
};

module.exports.productArrayToObject = function(productArray) {
    obj = {};

    productArray.forEach(function(product) {
        if (!obj[product]) {
            obj[product] = 0;
        }

        obj[product]++;
    });

    return obj;
};

module.exports.distance = distance;

function distance(coordinates1, coordinates2) {
    return Math.ceil(Math.sqrt(
        Math.pow(Math.abs(coordinates1[0] - coordinates2[0]), 2) +
        Math.pow(Math.abs(coordinates1[1] - coordinates2[1]), 2)
    ));
}

module.exports.getProductWeight = function(config, productId) {
    return config.productWeights[productId];
};

module.exports.getProductsWeight = function(config, products) {
    var weight = 0;
    _.each(products, function(number, productId) {
        var productWeight = Helper.getProductWeight(config, productId);

        weight += productWeight * parseInt(number);
    });

    return weight;
};

module.exports.getNotFinishedOrders = function(config) {
    var notCompletedOrders = [];
    _.each(config.orders, function(order) {
        if (!order.isComplete) {
            notCompletedOrders.push(order);
        }
    });

    return notCompletedOrders;
};

