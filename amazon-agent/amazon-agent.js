const request = require('request')
const cheerio = require('cheerio')
const mysql = require('mysql')
const nodemailer = require('nodemailer');
const pug = require('pug');
const path = require('path')

const compiledFunction = pug.compileFile(__dirname + path.sep + 'email-template.pug');

var pool = mysql.createPool({
	connectionLimit : 10,
	host : '127.0.0.1',
	user : process.env.MYSQL_USER,
	password : process.env.MYSQL_PASS,
	database : 'amazon',
	connectTimeout : 60 * 60 * 1000,
	acquireTimeout : 60 * 60 * 1000,
	timeout : 60 * 60 * 1000
});

console.log('Starting Amazon stock check at ' + new Date());

pool.getConnection(function(error, connection) {

	if(error) throw error;

	connection.query('select * from products where active=true',
			function(error, results, fields) {
				connection.destroy();
				results.forEach(function(row) {
					console.log("Checking stock for %s",row.url);
					checkInStock(row.url);
				});
	});


});

function checkInStock(url) {
	request.get({"headers": { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36" },
		"url": url},
		(error, response, body) => {
			if(error) throw error
		
			const $ = cheerio.load(body)
			const title = $('#productTitle').text().trim()
			if($('#availability').text().trim() === 'In stock.') {
				console.log(title + ' is in stock :)')
				email(title, url)
			} else {
				console.log(title + ' is out of stock :(')
			}
		}
	);
}

function email(name, url) {
	let transporter = nodemailer.createTransport({
		host : 'smtp.gmail.com',
		port : 465,
		secure : true, // true for 465, false for other ports
		auth : {
			user : process.env.SMTP_USER, // generated ethereal user
			pass : process.env.SMTP_PASS // generated ethereal password
		}
	});

	transporter.sendMail({
		from : '"Amazon Notifier" <sayani.iot@gmail.com>', // sender
																// address
		to : 'kiliyani.sajeesh@gmail.com', // list of receivers
		subject : name + " is in stock!",
		html : compiledFunction({
			name : name,
			url : url
		})
	});
}