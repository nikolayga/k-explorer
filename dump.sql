SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `systemContract`;
CREATE TABLE `systemContract` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `txhash` varchar(70) COLLATE utf8_unicode_ci NOT NULL,
  `blockNumber` int(11) NOT NULL,
  `address` varchar(70) COLLATE utf8_unicode_ci NOT NULL,
  `event` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `date` datetime DEFAULT NULL,
  `format_date` date DEFAULT NULL,
  `_depositContractAddress` varchar(70) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_keepAddress` varchar(70) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_signingGroupPubkeyX` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_signingGroupPubkeyY` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_txid` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_requester` varchar(70) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_digest` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_utxoValue` int(11) DEFAULT NULL,
  `_redeemerOutputScript` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_requestedFee` int(11) DEFAULT NULL,
  `_outpoint` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_r` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_s` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `_wasFraud` varchar(5) COLLATE utf8_unicode_ci DEFAULT NULL,
  `previousOwner` varchar(70) COLLATE utf8_unicode_ci DEFAULT NULL,
  `newOwner` varchar(70) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `txhash_date_event` (`txhash`,`date`,`event`),
  KEY `event` (`event`),
  KEY `transactionHash` (`txhash`),
  KEY `depositContractAddress` (`_depositContractAddress`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


DROP TABLE IF EXISTS `TokenContract`;
CREATE TABLE `TokenContract` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `txhash` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `blockNumber` int(11) NOT NULL,
  `address` varchar(70) COLLATE utf8_unicode_ci NOT NULL,
  `event` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `date` datetime NOT NULL,
  `format_date` date DEFAULT NULL,
  `from` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `to` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `value` double NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `txhash_value_to` (`txhash`,`value`,`to`),
  KEY `from` (`from`),
  KEY `to` (`to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;