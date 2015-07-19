'use strict';

(function() {
    var app = angular.module('mcbPersist', [])
        .service('persist', ['$q', Persistence]);
    /**
     * uses PouchDB
     *
     * https://cdnjs.cloudflare.com/ajax/libs/pouchdb/3.6.0/pouchdb.js
     * https://cdnjs.cloudflare.com/ajax/libs/pouchdb/3.6.0/pouchdb.min.js
     */

    function Persistence($q) {
        var persist = this;
        this.getDb = function() {
            if (this.db === undefined) {
                this.db = new PouchDB("dispensa");
            }
            return this.db;
        };
        this.remove = function(key) {
            var defer = $q.defer();
            this.getDb().get(key)
                .then(function(doc) {
                    persist.getDb().remove(doc)
                        .then(defer.resolve)
                        .catch(defer.reject);
                })
                .catch(function(error) {
                    defer.resolve("No doc with id: " + key + ' found');
                });
            return defer.promise;
        };
        this.store = function(key, obj) {
            var defer = $q.defer();
            var sData = JSON.stringify(obj);
            this.getDb().get(key)
                .then(function(doc) {
                    doc.data = sData;
                    persist.getDb().put(doc)
                        .then(defer.resolve)
                        .catch(defer.reject);
                })
                .catch(function(error) {
                    persist.getDb().put({
                            '_id': key,
                            'data': sData
                        })
                        .then(defer.resolve)
                        .catch(defer.reject);
                });
            return defer.promise;
        };
        this.retrieve = function(key) {
            var defer = $q.defer();
            this.getDb().get(key)
                .then(function(doc) {
                    if (doc.hasOwnProperty('data')) {
                        var data = JSON.parse(doc.data);
                        defer.resolve(data);
                    } else {
                        defer.resolve(doc);
                    }
                })
                .catch(function(error) {
                    defer.reject(error);
                });
            return defer.promise;
        };
    }
})();
