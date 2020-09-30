import Web3 from "web3"
import TBTC from "@keep-network/tbtc.js"

import { BitcoinHelpers } from "@keep-network/tbtc.js"
import { EthereumHelpers } from "@keep-network/tbtc.js"

import DepositJSON from "@keep-network/tbtc/artifacts/Deposit.json"
import BondedECDSAKeepJSON from "@keep-network/keep-ecdsa/artifacts/BondedECDSAKeep.json"
import TBTCConstantsJSON from "@keep-network/tbtc/artifacts/TBTCConstants.json"

import web3Utils from "web3-utils"
import ProviderEngine from "web3-provider-engine"
import Subproviders from "@0x/subproviders"
import { createRequire } from 'module';

const { toBN } = web3Utils
const require = createRequire(import.meta.url);
const express = require('express');
const fs = require('fs');
const moment = require('moment');
const https = require('https');
const app = express();
const app_http = express();
const minifyHTML = require('express-minify-html-2');
const config = require('./config/config');

app.set('view engine', 'ejs');
app.use(express.static('public'));


app.use(minifyHTML({
    override:      true,
    exception_url: false,
    htmlMinifier: {
        removeComments:            true,
        collapseWhitespace:        true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes:     true,
        removeEmptyAttributes:     true,
        minifyJS:                  true
    }
}));

const Utilities = require("./cron/helpers/Utility");
const favicon = require('serve-favicon');
const path = require('path');
const __dirname = path.resolve(path.dirname(''));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico') ) );


var eth_tracker = "https://etherscan.io/";
var tbtc = null;
var attempts = 0;


/* MySQL */
/* ---------------------------------------------------------------------------------------------------------------------------------*/
const mysql = require('mysql'); 
const SMysql = require('sync-mysql') ;

//create a connection
const db = mysql.createConnection({
    host    : config.db_host,
    user    : config.user,
    password: config.password,      
    database: config.database
});

//create a synchronic connection
const connection = new SMysql({ 
    host    : config.db_host,
    user    : config.user,
    password: config.password,      
    database: config.database
}) 

//connect to the database
db.connect((err) =>{
    if(err) throw err; 
    console.log('MySQL Connected!');
});


/* SITE */ 

/** @enum {number} */
export const DepositStates = {
  // Not initialized.
  START: 0,

  // Funding flow.
  AWAITING_SIGNER_SETUP: 1,
  AWAITING_BTC_FUNDING_PROOF: 2,

  // Failed setup.
  FAILED_SETUP: 3,

  // Active/qualified, pre- or at-term.
  ACTIVE: 4,

  // Redemption flow.
  AWAITING_WITHDRAWAL_SIGNATURE: 5,
  AWAITING_WITHDRAWAL_PROOF: 6,
  REDEEMED: 7,

  // Signer liquidation flow.
  COURTESY_CALL: 8,
  FRAUD_LIQUIDATION_IN_PROGRESS: 9,
  LIQUIDATION_IN_PROGRESS: 10,
  LIQUIDATED: 11
}

connection.query("SET SESSION wait_timeout = 604800"); 
setInterval(function () {
    db.query('SELECT 1');
}, 60000);

app.get('/', async (req, res) =>{
    var values = {};
	var totalMinted = 0;
	var totalMinted_ = 0;
	var totalRedempted = 0;
	var currentSuply = 0;

	let sql = "SELECT * FROM systemContract WHERE event = 'Created' ORDER by `date` DESC";
	let data = connection.query(sql);

	var sql1 = "SELECT MAX(value) AS value FROM  TokenContract WHERE `from`='0x0000000000000000000000000000000000000000' GROUP BY txhash ORDER BY txhash;";
    var results = connection.query(sql1);
	
	results.forEach(row=>{ 
		totalMinted+=row.value;
	});
	
	var sql1 = "SELECT SUM(value) AS value FROM  TokenContract WHERE `from`='0x0000000000000000000000000000000000000000'";
    var results = connection.query(sql1);
    totalMinted_= results[0].value;
	var sql1 = "SELECT SUM(value) AS value FROM  TokenContract WHERE `to`='0x0000000000000000000000000000000000000000'";
    var results = connection.query(sql1);
	totalRedempted = results[0].value;
	
	currentSuply = totalMinted_-totalRedempted;
	
	//deposit stat
	var sql_d = "SELECT COUNT(*) as counter, DATE_FORMAT(t1.format_date, '%Y-%m-%d') as `date` FROM systemContract AS t1\
              WHERE t1.event='Created' AND t1._depositContractAddress IN \
              (SELECT t2._depositContractAddress FROM systemContract t2 WHERE t2.event='Funded' ) \
              GROUP by t1.format_date order by t1.format_date asc;";        
    var results = connection.query(sql_d);
    
    fs.writeFile(__dirname+'/public/json-data/deposites.json', JSON.stringify(results), function (err) {
      if (err) throw err;
    });
	
	//transfers stat
	var sql_d = "SELECT COUNT(*) as counter, DATE_FORMAT(format_date, '%Y-%m-%d') as `date` FROM TokenContract\
              WHERE `from`!='0x0000000000000000000000000000000000000000' and `to`!='0x0000000000000000000000000000000000000000'\
              GROUP by format_date order by format_date asc";        
    var results = connection.query(sql_d);
    
    fs.writeFile(__dirname+'/public/json-data/transfers.json', JSON.stringify(results), function (err) {
      if (err) throw err;
    });
	
	
	//Redeemed stat
	var sql_d = "SELECT COUNT(*) as counter, DATE_FORMAT(t1.format_date, '%Y-%m-%d') as `date` FROM systemContract AS t1\
              WHERE t1.event='Created' AND t1._depositContractAddress IN \
              (SELECT t2._depositContractAddress FROM systemContract t2 WHERE t2.event='Redeemed' ) \
              GROUP by t1.format_date order by t1.format_date asc;";        
    var results = connection.query(sql_d);
    
    fs.writeFile(__dirname+'/public/json-data/redeemed.json', JSON.stringify(results), function (err) {
      if (err) throw err;
    });
	
	var currentdate = moment().format('YYYY-MM-DD 00:00:00');
	let sql_t = "SELECT * FROM  TokenContract WHERE `date`>'"+currentdate+"' AND `from`!='0x0000000000000000000000000000000000000000' and `to`!='0x0000000000000000000000000000000000000000' ORDER BY `date` DESC";
    let history_transfers = connection.query(sql_t);
	
	values.totalMinted = totalMinted;
	values.currentSuply = currentSuply;
	values.moment = moment;
	values.tracker = eth_tracker;
	values.data = data;
	values.current = "/";
	values.transfers24h = history_transfers.length;

	res.render('home', values);	
});


app.get('/deposits/', async (req, res) =>{
    var totalMinted = 0;
	let sql = "select t.*,(select s.event from `systemContract` as s where s._depositContractAddress = t._depositContractAddress and s.event='Funded') as isFunded,(select p.event from `systemContract` as p where p._depositContractAddress = t._depositContractAddress and p.event='Redeemed') as isRedeemed from `systemContract` as t where t.event='Created' order by t.`date` DESC";

	let data = connection.query(sql);

	res.render('deposits', {data:data, current:"/deposits/", pageTitle:"Deposits", moment: moment,tracker:eth_tracker});
});

app.get('/find/', async (req, res) =>{
    console.log(req.query.address);
    var data = new Array;
	var sql = "SELECT * FROM  TokenContract WHERE `from`='0x0000000000000000000000000000000000000000' and `to`= "+db.escape(req.query.address)+" ORDER BY `date` DESC";
	var results = connection.query(sql);
	if(results.length>0){
		results.forEach(row=>{ 
			var sub_sql = `SELECT * FROM  TokenContract WHERE txhash='${row.txhash}' ORDER BY value DESC`;
			var sub_results = connection.query(sub_sql);
			if(sub_results && sub_results.length>0){
				var o = sub_results[0];
				o._depositContractAddress = sub_results[1].to;
				o.fee = sub_results[1].value;
				
				var sql_state = "select t.*,(select s.event from `systemContract` as s where s._depositContractAddress = t._depositContractAddress and s.event='Funded') as isFunded,(select p.event from `systemContract` as p where p._depositContractAddress = t._depositContractAddress and p.event='Redeemed') as isRedeemed from `systemContract` as t where t.event='Created' and t._depositContractAddress='"+o._depositContractAddress+"'  order by t.`date` DESC";
				var state_data = connection.query(sql_state);
				if(state_data && state_data.length>0){
					o._keepAddress = state_data[0]._keepAddress;
					o.isFunded = state_data[0].isFunded;
					o.isRedeemed = state_data[0].isRedeemed;
				}
			}
			
			data.push(o);
		});
	}
	
	res.render('find', {data:data, current:"/find/", pageTitle:"Find Deposits", moment: moment,tracker:eth_tracker});
});


app.get('/tbtc-mints/', (req, res) =>{
    let sql = "SELECT * FROM  TokenContract WHERE `from`='0x0000000000000000000000000000000000000000'  ORDER BY `date` DESC";
    let data = connection.query(sql);

	
	res.render('tbtc-mints', {data:data, current:"/tbtc-mints/", pageTitle:"tbtc mints", moment: moment,tracker:eth_tracker});
});


app.get('/transfers/', (req, res) =>{
	let sql = "SELECT * FROM  TokenContract WHERE `from`!='0x0000000000000000000000000000000000000000' and `to`!='0x0000000000000000000000000000000000000000' ORDER BY `date` DESC";
    let data = connection.query(sql);

	res.render('transfers', {data:data, current:"/transfers/", pageTitle:"Transfers", moment: moment,tracker:eth_tracker});
});


app.get('/deposits/:address', async (req, res) =>{
	try {
		if(req.header('Referer') && req.header('Referer').includes("//keep-explorer.info") && Web3.utils.isAddress(req.params.address)){
			var info = await getDepositInfo(req.params.address);
			res.render('depositInfo', {current:"/depositInfo/", pageTitle:"depositInfo", info:info, address:req.params.address, moment: moment,tracker:eth_tracker});	
		}else res.redirect('/deposits/');
	 }catch (err) {
		 console.log(err);	
	}	
});


async function getDepositInfo(depositAddress){
	try {
		var engine = new ProviderEngine({ pollingInterval: 1000 });
		engine.addProvider(
			new Subproviders.PrivateKeyWalletSubprovider(
			  config.eth_private_key
			)
		)

		//config.endpoint
		engine.addProvider(
			new Subproviders.RPCSubprovider(
			  config.endpoint_web
			)
		)  

		var web3 = new Web3(engine)
		engine.start()
		web3.eth.defaultAccount = (await web3.eth.getAccounts())[0]


		tbtc = await TBTC.withConfig({
			web3: web3,
			bitcoinNetwork: "main",
			electrum: {
			  server: config.electrumx_server,
			  port: config.electrumx_port,
			  protocol: config.electrumx_protocol
			}
		});

		const networkId = await tbtc.config.web3.eth.net.getId();
		var keepAddress = null;
		
		var sql = `SELECT _keepAddress FROM systemContract WHERE _depositContractAddress = '${depositAddress}' AND event='Created'`;
	    if( keepAddress = connection.query(sql)) {
			keepAddress = keepAddress[0]._keepAddress;
		}
	
		const depositContract = EthereumHelpers.buildContract(
		  web3,
		  /** @type {TruffleArtifact} */ (DepositJSON).abi,
		  depositAddress
		)
		
		const keepContract = EthereumHelpers.buildContract(
		  web3,
		  /** @type {TruffleArtifact} */ (BondedECDSAKeepJSON).abi,
		  keepAddress
		)
		
		const constantsContract = EthereumHelpers.getDeployedContract(
		  /** @type {TruffleArtifact} */ TBTCConstantsJSON,
		  web3,
		  networkId.toString()
		)
		
		//state
		var currentState = parseInt(await depositContract.methods.currentState().call());
	
		console.log(currentState);
		var result = new Array;
		var step = 0;
		var transactions = null;
		var BitcoinAddress = null;
		
		switch(currentState) {
			case 0:
			case 1:
					result.push('<h5 class="card-title"><i class="fa fa-clock-o text-warning"></i> Create deposit</h5>\
			<p class="card-text">Requested a Keep signing group to generate a Bitcoin address</p>');
			step ++;
					break;
					
			case 2:
			case 4:
			case 5:
			case 6:
			case 7:
				result.push('<h5 class="card-title"><i class="fa fa-check text-success"></i> Create deposit</h5>\
				<p class="card-text">Requested a Keep signing group to generate a Bitcoin address</p>');
				step ++;
				
				//биткоин адрес
				var publicKeyPoint = findOrWaitForPublicKeyPoint(depositAddress);
				var BitcoinAddress =  await publicKeyPointToBitcoinAddress(publicKeyPoint);
				
				if(BitcoinAddress){
					result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> Signers generated a Bitcoin address</h5>\
				<p class="card-text">A Bitcoin address ${BitcoinAddress} to make funding is created</p>`);
					step ++;
					
				}else{
					result.push('<h5 class="card-title"><i class="fa fa-clock-o text-warning"></i> Signers generated a Bitcoin address.</h5>\
				<p class="card-text">A Bitcoin address to make funding is not created</p>');
				}
				
				if(BitcoinAddress && currentState<=4){
					var LotSizeSatoshis = toBN(await depositContract.methods.lotSizeSatoshis().call());
					transactions = await BitcoinHelpers.Transaction.findOrWaitFor(BitcoinAddress,LotSizeSatoshis.toNumber());
					
					if(transactions){
						step ++;
						result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> Payment send to the Bitcoin address</h5>\
						<p class="card-text max-320">Transaction - <a href="https://www.blockchain.com/btc/tx/${transactions.transactionID}" target="_blank">${transactions.transactionID}</a></p>`);
					}else{
						result.push('<h5 class="card-title"><i class="fa fa-clock-o text-warning"></i> Payment send to the Bitcoin address.</h5>\
						<p class="card-text"></p>');
					}
				}
				
				if(transactions && currentState<=4){
					var required = parseInt(await constantsContract.methods.getTxProofDifficultyFactor().call());  
					var transactionID = transactions.transactionID;
					
					var confirmations = await getConfirmations(transactionID);
					
					if(confirmations<required){
						result.push(`<h5 class="card-title"><i class="fa fa-clock-o text-warning"></i> Waiting for confirmations ${confirmations}/${required} on the Bitcoin chain</h5>\
			<p class="card-text">Required number of the confirmations is ${required}</p>`);
					}else if(confirmations>=required){
						step ++;
						result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> Got At least ${required} BTC confirmations</h5><p class="card-text"></p>`);					
					}
					
					if(confirmations>=required){
						if(currentState==2){
							result.push(`<h5 class="card-title"><i class="fa fa-clock-o text-warning"></i> Depositor proves funding transaction to Deposit </h5><p class="card-text"></p>`);
						}else if(currentState==4){
							step ++;
							result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> Depositor proved funding transaction to Deposit</h5><p class="card-text"></p>`);
						}
						
						if(currentState==4){
							var sql = `SELECT txhash  FROM  TokenContract WHERE \`to\`='${depositAddress}'`;
							var data = connection.query(sql);
							if(data){
								var sql = `SELECT txhash  FROM  TokenContract WHERE \`to\`!='${depositAddress}' and txhash='${data[0].txhash}'`;
								var data_txhash = connection.query(sql);
								step ++;
								result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> tBTC Minted</h5><p class="card-text max-320">Transaction - <a href="${eth_tracker}tx/${data_txhash[0].txhash}" target="_blank">${data_txhash[0].txhash}</a></p>`);
							}else{
								result.push(`<h5 class="card-title"><i class="fa fa-clock-o text-warning"></i> tBTC Minted</h5><p class="card-text"></p>`);
							}
						}
					}
				}
				
				if(currentState>4 && currentState<=7){

					step ++;
					result.push('<h5 class="card-title"><i class="fa fa-check text-success"></i> Payment send to the Bitcoin address</h5>\
					<p class="card-text"></p>');
						
					step ++;
					result.push('<h5 class="card-title"><i class="fa fa-check text-success"></i> Got required BTC confirmations</h5><p class="card-text"></p>');
					
					step ++;
					result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> Depositor proved funding transaction to Deposit</h5><p class="card-text"></p>`);
					
					var sql = `SELECT txhash  FROM  TokenContract WHERE \`to\`='${depositAddress}'`;
					var data = connection.query(sql);
					if(data){
						var sql = `SELECT txhash  FROM  TokenContract WHERE \`to\`!='${depositAddress}' and txhash='${data[0].txhash}'`;
						var data_txhash = connection.query(sql);
						step ++;
						result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> tBTC Minted</h5><p class="card-text max-320">Transaction - <a href="${eth_tracker}tx/${data_txhash[0].txhash}" target="_blank">${data_txhash[0].txhash}</a></p>`);
					}else{
						result.push(`<h5 class="card-title"><i class="fa fa-clock-o text-warning"></i> tBTC Minted</h5><p class="card-text"></p>`);
					}
					
					result.push(`<hr><h5 class="card-title">The Redeemed procedure is started</h5><hr>`);
					
					if(currentState==5){
						result.push(`<h5 class="card-title"><i class="fa fa-clock-o text-warning"></i> Awaiting withdrawal signature</h5><p class="card-text"></p>`);
					}	
					
					if(currentState==6){
						result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> Awaiting withdrawal signature</h5><p class="card-text"></p>`);
						result.push(`<h5 class="card-title"><i class="fa fa-clock-o text-warning"></i> Awaiting withdrawal proof</h5><p class="card-text"></p>`);
					}
					
					if(currentState==7){
						result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> Awaiting withdrawal signature</h5><p class="card-text"></p>`);
						result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> Awaiting withdrawal proof</h5><p class="card-text"></p>`);
						result.push(`<h5 class="card-title"><i class="fa fa-check text-success"></i> Redeemed</h5><p class="card-text"></p>`);
					}
				}
				
				break;
			case 3:
				step ++;
				result.push('<h5 class="card-title"><i class="fa fa-times text-danger"></i> Deposit setup is faied</h5>\
				<p class="card-text"></p>');
				break;
			
		}
		
		var pr = Math.round(step / 6 * 100);
		var pre_info = `<div class="progress mb-3"><div class="progress-bar" role="progressbar" style="width: ${pr}%;" aria-valuenow="${pr}" aria-valuemin="0" aria-valuemax="100">${pr}%</div></div>`;
			
		attempts = 0;
		return pre_info + result.join("");
	} catch (err) {
		console.log(err);

		if(err.toString().includes("failed to connect to electrum server") && attempts<10){
			attempts++;
			var info = await getDepositInfo(depositAddress);
		}else{
			var info = '<div class="alert alert-danger">Network error! Please try later</div>';
		}
		return info;
	}	
}

async function getConfirmations(transactionID){
	return BitcoinHelpers.withElectrumClient(async electrumClient => {
		const { confirmations } = await electrumClient.getTransaction(
		  transactionID
		)
		
		  return confirmations
	})
}

function findOrWaitForPublicKeyPoint(depositAddress) {
	var sql = `SELECT _signingGroupPubkeyX as x ,_signingGroupPubkeyY as y FROM systemContract WHERE _depositContractAddress = '${depositAddress}' AND event='RegisteredPubkey'`;
	return connection.query(sql)[0];
}

async function publicKeyPointToBitcoinAddress(publicKeyPoint) {
    return BitcoinHelpers.Address.publicKeyPointToP2WPKHAddress(
      publicKeyPoint.x,
      publicKeyPoint.y,
      tbtc.config.bitcoinNetwork
    )
}


/**dev***/

app.listen(3000, () =>{
    console.log('Server default online!');
});
