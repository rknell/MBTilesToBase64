#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(process.argv[2]);
const q = require('q');

function insertData(db, row) {
  var deferred = q.defer();

  db.run("INSERT INTO tiles64 VALUES(?,?,?,?)", [row.zoom_level, row.tile_column, row.tile_row, row.tile_data.toString('base64')], function (err) {
    if(err){
      deferred.reject(err)
    } else {
      deferred.resolve();
    }

  });

  return deferred.promise;
}

function each() {
  const deferred = q.defer();

  const actions = [];

  const eachPromise = q.defer();
  db.each("SELECT * FROM tiles", (err, row)=>{
    actions.push(insertData(db, row));
    eachPromise.resolve();
  });
  actions.push(eachPromise.promise);

  return q.all(actions);

  // return q.promise;
}

function dbRun(db, query, params) {
  const deferred = q.defer();

  db.run(query,params,function (err, response) {
    console.log("Running query", query, params);
    if(err)
      deferred.reject(err)
    else
      deferred.resolve(response);
  });

  return deferred.promise;

}



// db.serialize(function () {
//   db.run("DROP TABLE IF EXISTS tiles64");
//   db.run("CREATE TABLE tiles64 (zoom_level INT, tile_column INT, tile_row INT, tile_data TEXT)", function () {
//     db.each("SELECT * FROM tiles", function (err, row) {
//
//     });
//   });
//
//
//
//   // var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
//   // for (var i = 0; i < 10; i++) {
//   //   stmt.run("Ipsum " + i);
//   // }
//   // stmt.finalize();
//   //
//
// });

function go() {
  dbRun(db,"DROP TABLE IF EXISTS tiles64")
    .then(()=>dbRun(db,"CREATE TABLE tiles64 (zoom_level INT, tile_column INT, tile_row INT, tile_data TEXT)"))
    .then(each)
    .then(()=>dbRun(db, "DROP TABLE tiles"))
    .then(()=>dbRun(db, "ALTER TABLE tiles64 RENAME TO tiles"))
    .then(()=> {
      console.log("Processing complete");
      db.close()
    })
    .catch(err=>{
      console.error(err);
      console.log(err.trace())
    })
}
go();