import Web3 from "web3"
import TBTC from "@keep-network/tbtc.js"
//import TBTC from "../tbtc.js/index.js"

import ProviderEngine from "web3-provider-engine"
import Subproviders from "@0x/subproviders"
import { EthereumHelpers } from "@keep-network/tbtc.js"

//import EthereumHelpers from "../tbtc.js/src/EthereumHelpers.js"
/** @typedef { import("../src/EthereumHelpers.js").Contract } Contract */
/** @typedef { import("../src/EthereumHelpers.js").TruffleArtifact } TruffleArtifact */
/** @typedef { import("../src/EthereumHelpers.js").TransactionReceipt } TransactionReceipt */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const engine = new ProviderEngine({ pollingInterval: 1000 })
const path = require('path');
const __dirname = path.resolve(path.dirname(''));

var fs = require('fs');
var config = require('../config/config');
var Utilities = require("./helpers/Utility");
var db = require('./helpers/Db');
var cron = require('node-cron');
var util = require('util');
var log_file = fs.createWriteStream(__dirname+'/debug.log', {flags : 'w'});
var log_stdout = process.stdout;
var throttle = 1000;
var start = +new Date();

console.l = function(d) { log_file.write(util.format(d) + '\n');};

var startBlock = 0;
engine.addProvider(
	new Subproviders.PrivateKeyWalletSubprovider(
	  config.eth_private_key 
	)
)

engine.addProvider(
	new Subproviders.RPCSubprovider(
	  config.endpoint_cron
	)
)  

const web3 = new Web3(engine)
engine.start()
web3.eth.defaultAccount = (await web3.eth.getAccounts())[0]


const tbtc = await TBTC.withConfig({
	web3: web3,
	bitcoinNetwork: "main",
	electrum: {
	  server: config.electrumx_server,
	  port: config.electrumx_port,
	  protocol: config.electrumx_protocol
	}
})

//const lotSizes = await tbtc.Deposit.availableSatoshiLotSizes()

var systemContract = await tbtc.Deposit.system()
//var depositFactoryContract  = await tbtc.Deposit.depositFactory()
//var depositTokenContract    = await tbtc.Deposit.depositToken()
var TokenContract   		= await tbtc.Deposit.token()
//var vendingMachineContract  = await tbtc.Deposit.vendingMachine()
//var fundingScriptContract   = await tbtc.Deposit.fundingScript()
  

async function saveEvent(contract, name, event, contract_type){
	if(contract_type=="systemContract"){
		if(event.event=="Created"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'_depositContractAddress':event.returnValues._depositContractAddress, 
				'_keepAddress':event.returnValues._keepAddress, 
				'date': Utilities.toMysqlFormat(new Date(event.returnValues._timestamp * 1000)), 
			};
		}else if(event.event=="RegisteredPubkey"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'_depositContractAddress':event.returnValues._depositContractAddress, 
				'_signingGroupPubkeyX':event.returnValues._signingGroupPubkeyX, 
				'_signingGroupPubkeyY':event.returnValues._signingGroupPubkeyX,
				'date': Utilities.toMysqlFormat(new Date(event.returnValues._timestamp * 1000)), 
			};
		}else if(event.event=="Funded"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'_depositContractAddress':event.returnValues._depositContractAddress, 
				'_txid':event.returnValues._txid, 
				'date': Utilities.toMysqlFormat(new Date(event.returnValues._timestamp * 1000)), 
			};
		}else if(event.event=="RedemptionRequested"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'_depositContractAddress':event.returnValues._depositContractAddress, 
				'_requester':event.returnValues._requester, 
				'_digest':event.returnValues._digest, 
				'_utxoValue':event.returnValues._utxoValue, 
				'_redeemerOutputScript':event.returnValues._redeemerOutputScript, 
				'_requestedFee':event.returnValues._requestedFee, 
				'_outpoint':event.returnValues._outpoint 
			};
		}else if(event.event=="GotRedemptionSignature"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'_depositContractAddress':event.returnValues._depositContractAddress, 
				'_digest':event.returnValues._digest, 
				'_r':event.returnValues._r, 
				'_s':event.returnValues._s 
			};
		}else if(event.event=="Redeemed"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'_depositContractAddress':event.returnValues._depositContractAddress, 
				'_txid':event.returnValues._digest, 
				'date': Utilities.toMysqlFormat(new Date(event.returnValues._timestamp * 1000)), 
			};
		}else if(event.event=="StartedLiquidation"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'_depositContractAddress':event.returnValues._depositContractAddress, 
				'_wasFraud':event.returnValues.previousOwner, 
				'date': Utilities.toMysqlFormat(new Date(event.returnValues._timestamp * 1000)), 
			};
		}else if(event.event=="Liquidated"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'_depositContractAddress':event.returnValues._depositContractAddress, 
				'date': Utilities.toMysqlFormat(new Date(event.returnValues._timestamp * 1000)), 
			};
		}else if(event.event=="SetupFailed"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'_depositContractAddress':event.returnValues._depositContractAddress, 
				'date': Utilities.toMysqlFormat(new Date(event.returnValues._timestamp * 1000)), 
			};
		}else if(event.event=="OwnershipTransferred"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'previousOwner':event.returnValues.previousOwner, 
				'newOwner':event.returnValues.newOwner, 
				//'date': Utilities.toMysqlFormat(new Date(event.returnValues._timestamp * 1000)), 
			};
		}else if(event.event=="LotSizesUpdateStarted"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address,
				'date': Utilities.toMysqlFormat(new Date(event.returnValues._timestamp * 1000)), 
			};
		}else if(event.event=="LotSizesUpdated"){
			var o = {
				'txhash':event.transactionHash,
				'blockNumber':event.blockNumber,
				'event':event.event,
				'address':event.address, 
			};
		}else{
			console.l(event);
		}
		

		db.connection.query('INSERT INTO systemContract SET ?', o, function(err, result) {
			if(err==null) {
				db.connection.query("UPDATE `systemContract` set format_date = DATE_FORMAT(`date`, '%Y-%m-%d') WHERE `date` is not null AND format_date is NULL", {}, function(err1, result1) {});
			}else{
				if(!err.toString().includes("Duplicate entry")){
					console.l(event);
					console.l(err);
				}
			}
		});
	}else if(contract_type=="TokenContract"){
		
		var path =  __dirname+'/blocks_cache/'+event.blockNumber;
		var block = null; 
		var transaction = null;
		var datetime = null;
		
		if (fs.existsSync(path)){
			try {
				block = JSON.parse(fs.readFileSync(path,{ encoding: 'utf8' }));
			} catch (err) {

			}	
		}else{
			console.l(path);
			block = await web3.eth.getBlock(event.blockNumber);
			if(!!block && block.timestamp) fs.writeFile( path, JSON.stringify(block),function(){});
		}
		

		if(!!block) datetime = Utilities.toMysqlFormat(new Date(block.timestamp * 1000)); else datetime = block;
	
	
		var o = {
			'txhash':event.transactionHash,
			'blockNumber':event.blockNumber,
			'event':event.event,
			'address':event.address,
			'from':event.returnValues.from,
			'to':event.returnValues.to,
			'date': datetime, 
			'value': web3.utils.fromWei(event.returnValues.value)
		};

		db.connection.query('INSERT INTO TokenContract SET ?', o, function(err, result) {
			if(err==null) {
				db.connection.query("UPDATE `TokenContract` set format_date = DATE_FORMAT(`date`, '%Y-%m-%d') WHERE `date` is not null AND format_date is NULL", {}, function(err1, result1) {});
			}else{
				if(!err.toString().includes("Duplicate entry")){
					console.l(event);
					console.l(err);
				}
			}
		});
	}
}

const remember = (i, contract, name , contract_type) => {
	if (i < 10867000 ) {	
		return('done');
	}
	var end = +new Date();

	if((end-start) / 1000 > 10 || startBlock-i > 9){
		end=null;start=null;
		if (global.gc) global.gc();
		console.log("stop fix all - " + Utilities.toMysqlFormat(new Date()) + " - "+contract_type);
		return ("stop cron");
	}
	
	let eventPromise = contract.getPastEvents(name, { fromBlock: i-10, toBlock: i });
	
	eventPromise.then(pastEvents => {

		pastEvents.forEach(event=>{ 
			saveEvent(contract, name, event, contract_type) ;
		});

		setTimeout(()=>{
		  eventPromise = null;
		  pastEvents = null;
		  remember(i-9, contract, name, contract_type);
		}, throttle)
	}).catch(err=>{
		console.log(err);
		console.log("error");
	});  
}

const rememberBig = (i, contract, name , contract_type) => {
	if (i < 10867000 ) {	
		return('done');
	}
	var end = +new Date();

	if((end-start) / 1000 > 10 || startBlock-i > 10001){
		end=null;start=null;
		if (global.gc) global.gc();
		console.log("stop fix all - " + Utilities.toMysqlFormat(new Date()) + " - "+contract_type);
		return ("stop cron");
	}
	
	let eventPromise = contract.getPastEvents(name, { fromBlock: i-1000, toBlock: i });

	eventPromise.then(pastEvents => {
		console.l("eventPromise-"+contract_type);
		pastEvents.forEach(event=>{ 
			saveEvent(contract, name, event, contract_type) ;
		});

		setTimeout(()=>{
		  eventPromise = null;
		  pastEvents = null;
		  remember(i-999, contract, name, contract_type);
		}, throttle)
	}).catch(err=>{
		console.log(err);
		console.log("error");
	});  
}

cron.schedule('*/3 * * * *', () => {
	try {	
		console.log("start fix all - " + Utilities.toMysqlFormat(new Date()));
		start = +new Date();
		console.l("start");
		web3.eth.getBlockNumber().then(function(block){
			startBlock = block;
			console.log(block)
			remember(block,systemContract,"allEvents","systemContract");
			remember(block,TokenContract,"Transfer","TokenContract");


		}).catch(err=>{
			console.log(err);
		});  		
	} catch (err) {
		console.log(err);
	}		
});

