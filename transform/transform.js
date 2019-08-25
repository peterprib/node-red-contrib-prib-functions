const ts=(new Date().toString()).split(' ');
console.log([parseInt(ts[2],10),ts[1],ts[4]].join(' ')+" - [info] transform Copyright 2019 Jaroslav Peter Prib");

let ISO8583,ISO8583message;
const regexLines=/(?!\B"[^"]*)\n(?![^"]*"\B)/g;
const regexCSV=/,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
function removeQuotes(d){
	return d.length>1 && d.startsWith('"') && d.endsWith('"') ? d.slice(1,-1) : d;
}
const functions={
	CSVToArray: (data)=>{
		let lines = data.split(regexLines);
		lines.forEach((value, idx) => {
			lines[idx]=value.split(regexCSV).map((c)=>removeQuotes(c));
		});
		return lines;
	},
	CSVWithHeaderToArray: (data)=>functions.CSV2Array(data).shift(),
	CSVWithHeaderToJSON: (data)=>{
		let lines = data.split(regexLines);
		var headers=lines.pop().split(regexCSV);
		lines.forEach((value, idx) => {
			var o={};
			value.split(regexCSV).forEach((c,i)=>{
				o[header[i]]=removeQuotes(c);
			});
			lines[idx]=o;
		});
		return lines;
	},
	ISO8385ToArray: (data)=>ISO8583message.unpackSync(data, data.length),
	ISO8385ToJSON: (data)=>{
		let j={},d=ISO8583message.unpackSync(data, data.length);
		d.forEach((r)=>{
			j[ISO8583BitMapId(r[0]).name]=r[1];
		});
		return r;
	},
	ArrayToISO8385: (data)=>ISO8583message.packSync(data),
	JSONToISO8385: (data)=>{
		var d=[];
		Object.getOwnPropertyNames(data).forEach((v)=>d.push([ISO8583BitMapName[v].id,data[v]]));
		d.sort((a, b) => a[0] - b[0]);
		return ISO8583message.packSync(d);
	},
	JSONToArray: (data)=>{
		if(data instanceof Object){
			let a=[];
			for(let p in data) {
				a.push([p,functions.JSONToArray(data[p])]);
			}
			return a;
		}
		return data;
	},
	JSONToHTML: (data)=>{
		if(data instanceof Object){
			let a=[];
			for(let p in data) {
				a.push("<td><![cdata["+p+"]]><td></td><![cdata["+functions.JSONToHTML(data[p])+"]]></td>");
			}
			return "<table><tr>"+a.join("</tr><tr>")+"</tr><table>";
		}
		return data;
	},
	ArrayToCSV: (data)=>data.map(x=>JSON.stringify(x)).join("\n"),
	JSONToString: (data)=>JSON.stringify(data),
	StringToJSON: (data)=>JSON.parse(data)
};
module.exports = function (RED) {
    function transformNode(n) {
        RED.nodes.createNode(this,n);
    	var node=Object.assign(this,n);
    	if(node.actionSource=="ISO8583" || node.actionTarget=="ISO8583") {
    		if(!ISO8583) {
        		try{
            		ISO8583 = require('iso-8583');
            		ISO8583message = ISO8583.Message();
            		node.log("loaded iso-8583");
        		} catch (e) {
        			node.error("need to run 'npm install iso-8583'");
        			this.status({fill:"red",shape:"ring",text:"iso-8583 not installed"});
        			return;
        		}
    		}
    	}
    	try {
        	node.transform=functions[node.actionSource+"To"+node.actionTarget];
        	if(!node.transform) throw Error("transform routine not found");
    	} catch (e) {
			node.error(node.actionSource+" to "+node.actionTarget + " not implemented, "+e);
			this.status({fill:"red",shape:"ring",text:node.actionSource+"\nto "+node.actionTarget + " not implemented"});
			return;
    	}
		this.status({fill:"green",shape:"ring",text:"Ready"});
        node.on("input", function(msg) {
        	try{
            	msg.payload=node.transform.apply(node,[msg.payload]);
        	} catch (e) {
    			node.error(node.actionSource+" to "+node.actionTarget + " " +e);
    			this.status({fill:"red",shape:"ring",text:"Error(s)"});
    			return;
        	}
			node.send(msg);
        });                
    }
    RED.nodes.registerType("transform",transformNode);
};

const ISO8583BitMap=[
	[1,'MessageFunction','Identifies the type of process related to the message'],
	[2,'ProtocolVersion','Version of the protocol specifications.'],
	[3,'ExchangeIdentification','Unique identification of an exchange occurrence'],
	[4,'RetransmissionCounter','Indicates the number of retransmissions of the message'],
	[5,'TransmissionDateandTime','Indicates the date and time at which the message was created'],
	[6,'SenderIdentifier','Code identifying the forwarding institution'],
	[7,'InitiatingPartyType','Type of identified entity'],
	[8,'InitiatingPartyIdentifierAssigner','Entity assigning the identification (for example merchant, acceptor, acquirer, or tax authority).'],
	[9,'InitiatingPartyShortName','Name of the entity.'],
	[10,'ReceiverIdentifier','Code identifying the receiving institution (e.g. intermediary entity)'],
	[11,'RecipientPartyType','Type of identified entity'],
	[12,'RecipientPartyAssigner','Entity assigning the identification (for example merchant, acceptor, acquirer, or tax authority).'],
	[13,'RecipientPartyShortName','Name of the entity.'],
	[14,'RelayIdentifier','Identification of a partner of a message exchange.'],
	[15,'RelayIdentifierType','Type of identified entity'],
	[16,'RelayIdentifierAssigner','Entity assigning the identification (for example merchant, acceptor, acquirer, or tax authority).'],
	[17,'RelayShortName','Name of the entity.'],
	[18,'TraceDateTimeIn','Date and time of incoming data exchange for relaying or processing.'],
	[19,'TraceDateTimeOut','Date and time of the outgoing exchange for relaying or processing'],
	[20,'AcquirerIdentifier','Code identifying the acquirer or delegated entity'],
	[21,'AcquirerAddress','Information that locates and identifies a specific address of the Acquirer, as defined by postal services'],
	[22,'AcquirerCountry','Information that locates and identifies the country of the Acquirer'],
	[23,'Acquirer Account','The account of the acquirer'],
	[24,'AcquirerType','Type of identified entity'],
	[25,'AcquirerIdentifierAssigner','Entity assigning the identification (for example merchant, acceptor, acquirer, or tax authority).'],
	[26,'AcquirerShortName','Name of the entity.'],
	[27,'AcquirerParametersVersion','Version of the payment acquirer parameters of the POI.'],
	[28,'AcceptorIdentifier','Identification of the entity.'],
	[29,'AcceptorType','Type of identified entity'],
	[30,'AcceptorIdentifierAssigner','Entity assigning the identification (for example merchant, acceptor, acquirer, or tax authority).'],
	[31,'AcceptorShortName','Name of the entity.'],
	[32,'AcceptorNameLocation','The name of the card acceptor : Name of the merchant as appearing on the receipt.'],
	[33,'AcceptorLocationCategory','Business location type (e.g. train, air-plane, etc.)'],
	[34,'AcceptorAddress','The name and location of the card acceptor: Location of the merchant where the transaction took place, as appearing on the receipt'],
	[35,'AcceptorCountry','Country of the merchant where the transaction took place.'],
	[36,'AcceptorSchemeData','Additional merchant data required by a card scheme'],
	[37,'POIIdentifier','Unique code identifying a POI at the card acceptor location. This code might be structured and composed of different information, e.g. to include Terminal, POI system and Card acceptor system identifiers.'],
	[38,'POIIdentifierType','Type of identified entity'],
	[39,'POIIdentifierAssigner','Entity assigning the identification (for example merchant, acceptor, acquirer, or tax authority).'],
	[40,'POIShortName','Name of the entity.'],
	[41,'POISystemName','Common name assigned by the acquirer to the POI system'],
	[42,'POIGroupIdentifier','Identifier assigned by the merchant identifying a set of POI terminals performing some categories of transactions.'],
	[43,'POICardReadingCapabilities','Permits to identify the POI capability and then which operational rules apply'],
	[44,'POICardholderVerificationCapabilities','Permits to identify the POI capability and then which operational rules apply'],
	[45,'POIOnLineCapabilities','On-line and off-line capabilities of the POI'],
	[46,'POIDisplayType','Permits to identify the POI capability and then which operational rules apply Capabilities of the display components performing the transaction'],
	[47,'POIDisplayNumberOfLines',''],
	[48,'POIDisplayLineWidth','Permits to identify the POI capability and then which operational rules apply Capabilities of the display components performing the transaction'],
	[49,'POIPrintLineWidth','Permits to identify the POI capability and then which operational rules apply Capabilities of the display components performing the transaction'],
	[50,'POIComponentType','Type of component belonging to a POI Terminal'],
	[51,'POIComponentProviderIdentifier','Identification of the software, hardware or system provider of the POI component'],
	[52,'POIComponentIdentifier','Identification of the component assigned by the provider'],
	[53,'POIComponentSerialNumber','Serial number of a component.'],
	[54,'POIComponentVersionNumber','Current version of component that might include the release number.'],
	[55,'POIComponentStandardComplianceIdentifier','Identification of the standard for which the component complies with'],
	[56,'POIComponentStandardComplianceVersion','Version of the standard for which the component complies with'],
	[57,'POIComponentAssessmentlNumber','Unique number for the assessment of a component, delivered by a  certification body. '],
	[58,'CardPresenceIndicator','Indicate whether card was physically present at merchant location to initiate transaction.'],
	[59,'CardholderPresenceIndicator','Indicate whether the cardholder was physically present at merchant location to initiate transaction.'],
	[60,'AttendanceTypeIdentifier','Identifies whether an attendant was present at the POI when the transaction was initiated.'],
	[61,'BusinessEnvironmentTypeIdentifier','Identifies in what type of business environment the transaction has taken place, e.g. private or public.'],
	[62,'TransactionChannelIdentifier','Identifies by means of which communication channel the transaction was conducted e.g. e-commerce or telephone order.'],
	[63,'AttendantMessageCapabilitityIndicator','Indicates whether the POI has capability of displaying a message to the attendant.'],
	[64,'AttendantLanguageIdentifier','Identifies the language used to display messages to the attendant.'],
	[65,'CardDataEntryModeIdentifier','Identifies the method used to enter card information into the transaction.'],
	[66,'FallbackIndicator','Indicates occurrence of fallback in card entry (i.e., primary/preferred entry method failed).'],
	[67,'SaleSystemIdentifier','Identifier of the electronic cash register and/or Sale system used by the acceptor to conduct the transaction.'],
	[68,'SaleSystemTransactionIdentifier','Identifier of the transaction assigned by the electronic cash register or Sale system of the acceptor.'],
	[69,'SaleSystemReconciliationIdentifier','Identifies the reconciliation period between the ECR or Sale system and POI.'],
	[70,'AttendantIdentification','Identifies the attendant person (e.g. cashier) who carried out the transaction.'],
	[71,'AttendantShiftIdentifier','Shift identification of the attendant (e.g. cashier).'],
	[72,'SaleSystemReferenceData','Additional reference data assigned to the transaction by the electronic cash register or Sale system of the acceptor.'],
	[73,'Amount,Authorised(Numeric)','Authorised amount of the transaction (excluding adjustments)'],
	[74,'Amount,Other(Numeric)','Secondary amount associated with the transaction representing a cashback amount'],
	[75,'ApplicationCryptogram(AC)','Cryptogram returned by the ICC in response of the GENERATE AC command'],
	[76,'ApplicationEffectiveDate','Date from which the application may be used'],
	[77,'ApplicationInterchangeProfile(AIP)','Indicates the capabilities of the card to support specific functions in the application'],
	[78,'ApplicationPriorityIndicator','Indicates the priority of a given application or group of applications in a directory'],
	[79,'ApplicationTransactionCounter(ATC)','Counter maintained by the application in the ICC (incrementing the ATC is managed by the ICC)'],
	[80,'ApplicationVersionNumber-Terminal','Version of the application specification used for implemention'],
	[81,'CryptogramInformationData(CID)','Indicates the type of cryptogram and the actions to be performed by the terminal'],
	[82,'CardholderVerificationMethod(CVM)Result','Indicates the results of the last CVM performed'],
	[83,'DedicatedFile(DF)Name','Identifies the name of the DF as described in ISO/IEC 7816-4'],
	[84,'InterfaceDevice(IFD)SerialNumber','Unique and permanent serial number assigned to the IFD by the manufacturer'],
	[85,'IssuerApplicationData(IAD)','Contains proprietary application data for transmission to the issuer in an online transaction.'],
	[86,'TerminalCapabilities','Indicates the card data input, CVM, and security capabilities of the terminal'],
	[87,'TerminalCountryCode','Indicates the country of the terminal, represented according to ISO 3166'],
	[88,'TerminalType','Indicates the environment of the terminal, its communications capability, and its operational control'],
	[89,'TerminalVerificationResult(TVR)','Status of the different functions as seen from the terminal'],
	[90,'TransactionCurrencyCode','Indicates the currency code of the transaction according to ISO 4217'],
	[91,'TransactionDate','Local date that the transaction was authorised'],
	[92,'TransactionSequenceCounter','Counter maintained by the terminal that is incremented by one for each transaction'],
	[93,'TransactionType','Indicates the type of financial transaction, represented by the first two digits of the ISO 8583:1987 Processing Code. The actual values to be used for the Transaction Type data element are defined by the relevant payment system'],
	[94,'UnpredictableNumber','Value to provide variability and uniqueness to the generation of a cryptogram'],
	[95,'IssuerScriptResults','Indicates the result of the terminal script processing'],
	[96,'IssuerAuthenticationData(IATD)','Data sent to the ICC for online issuer authentication'],
	[97,'IssuerScriptTemplate1','Contains proprietary issuer data for transmission to the ICC before the second GENERATE AC command'],
	[98,'IssuerScriptTemplate2','Contains proprietary issuer data for transmission to the ICC after the second GENERATE AC command'],
	[99,'TransactionCapture','Indicator whether the present financial transaction must be captured for clearing.'],
	[100,'ServiceType','Type of service being undertaken.'],
	[101,'AdditionalService','Service in addition to the main service.'],
	[102,'ServiceAttribute','Additional attribute of the service type.'],
	[103,'MerchantCategoryCode','Code assigned by the Acquirer, containing the ISO 18245-4 MCC code associated with the category of services or goods purchased in this transaction.'],
	[104,'TransactionDateTime','Local date and time assigned by the initiator of the transaction.'],
	[105,'TransactionReference','Identification of the transaction that has to be unique in combination with TransactionDateTime for the merchant and the POI.'],
	[106,'RePresentmentReason','Reason for representment of a card transaction'],
	[107,'TransactionLifecycleIdentifier','Identification of the transaction for the whole lifecycle'],
	[108,'OriginalTransactionDateTime','Local date and time assigned by the initiator of the original transaction.'],
	[109,'OriginalTransactionReference','Identification of the original transaction that has to be unique in combination with TransactionDateTime for the merchant and the POI.'],
	[110,'OrginalPOIIdentification','Identification of the POI (Point Of Interaction) that has performed the original transaction'],
	[111,'OrginalInitiatorTransactionIdentification','InitiatorTransactionIdentification of the original transaction'],
	[112,'OrginalRecipientTransactionIdentification','RecipientTransactionIdentification of the original transaction'],
	[113,'OrginalTransactionType','Type of original transaction being undertaken for the main service.'],
	[114,'OrginalAdditionalService','Service in addition to the main service of original transaction.'],
	[115,'OrginalServiceAttribute','Additional attribute of the service type of original transaction.'],
	[116,'OrginalAuthorisationEntity','Type of party that has delivered or declined the authorisation for the original transaction'],
	[117,'OrginalResponse','Result of the autorisation.'],
	[118,'OrginalResponseReason','Detailed result of the transaction.'],
	[119,'OrginalAuthorisationCode','Value assigned by the authorising party.'],
	[120,'ReconciliationIdentification','Identification of the reconciliation period assigned to the transaction.'],
	[121,'TransactionCurrency','Currency of TotalAmount and DetailedAmount'],
	[122,'TotalAmount',' Total amount for the transaction.'],
	[123,'Currency Exchange','Reports on currency exchange information.'],
	[124,'AmountQualifier','Qualifies the amount associated with the TransactionType'],
	[125,'TypeOfDetailedAmount','Type of amount like Cashback, Gratuity or Fees'],
	[126,'ValueOfDetailedAmount','Amount value.'],
	[127,'ValidityDate','Transaction authorisation deadline to complete the related payment.'],
	[128,'TransactionSuccess','Outcome of the transaction at the acceptor.'],
	[129,'Reversal','Notify that a previous transaction has to be reversed if this original transaction has been approved by the acquirer.'],
	[130,'MerchantOverride','Indicate that the acceptor has forced the transaction in spite of the authorisation result (online or offline), or incident to complete the transaction.'],
	[131,'FailureReason','List of incidents during the transaction.'],
	[132,'OnlineReason','Indicates to the Acquirer the primary reason why the transaction has been sent online by the Card Acceptor.'],
	[133,'UnattendedLevelCategory','The category level for the transaction of unattended POI terminals assigned by the POI application.'],
	[134,'AccountType','Type of account used for the transaction selected by the cardholder.'],
	[135,'SequenceNumber','Indicates the recurring/instalment occurrence of the transaction'],
	[136,'PeriodUnit','Period unit between consecutive payments (for example day, month, year).'],
	[137,'InstalmentPeriod','Number of period units between consecutive payments.'],
	[138,'TotalNumberOfPayments','Total number of instalment payments.'],
	[139,'InterestCharges','Interest charged in percentage for the total amount of payments.'],
	[140,'ProductCode','Product code of the item purchased.'],
	[141,'UnitOfMeasure','Unit of measure of the item purchased.'],
	[142,'ProductQuantity','Product quantity.'],
	[143,'UnitPrice','Price per unit of product.'],
	[144,'ProductAmount','Monetary value of purchased product.'],
	[145,'TaxType','Information on tax paid on the product.'],
	[146,'AdditionalProductInformation','Additional information related to the product.'],
	[147,'AuthorisationEntityIdentifier','Identifier of the Authorisation Entity.'],
	[148,'AuthorisationEntityType','Type of the Authorisation Entity.'],
	[149,'AuthorisationEntityAssigner','Assigner of the Authorisation Entity Identifier.'],
	[150,'AuthorisationEntityShortName','Name of the Authorisation Entity.'],
	[151,'Response','Result of the authorisation.'],
	[152,'ResponseReason','Detailed result of the authorisation.'],
	[153,'AuthorisationCode','Value assigned by the authorising party.'],
	[154,'ElectronicCommerceAuthenticationResult','Result of an e-commerce authentication process.'],
	[155,'CSCResult','Result of the printed card security code (CSC) validation.'],
	[156,'DeclinedProductCode','Product code for which the authorisation was declined.'],
	[157,'ActionTypeToBePerformed','Type of action to be performed by the POI (Point Of Interaction) system.'],
	[158,'MessageToPresent','Message to be displayed to the cardholder or the cashier.'],
	[159,'RespondedBalance','Balance of the account, related to the payment.'],
	[160,'CurrencyOfBalance','Currency of the Balance Amount'],
	[161,'Track1Data','The information encoded on track 1 of the magnetic stripe as defined in ISO 7813, including field separators but excluding beginning and ending sentinels and longitudinal redundancy check characters as defined therein.'],
	[162,'Track2Data','The information encoded on track 2 of the magnetic stripe as defined in ISO 7813, excluding beginning and ending sentinels and longitudinal redundancy check characters as defined therein.'],
	[163,'Track3Data','The information encoded on track 3 of the magnetic stripe as defined in ISO 4909, including field separators, but excluding beginning and ending sentinels and longitudinal redundancy check characters as defined therein.'],
	[164,'CardSequenceNumber','A number distinguishing between separate cards with the same primary account number.'],
	[165,'CardVerificationData','A number that is only printed on the card which is not included in any other technology e.g. magnetic stripe or ICC.'],
	[166,'CardholderBillingAddressCompressed','Numeric and postcode elements only of the cardholder/delivery address '],
	[167,'CardholderBillingPostalCode','Code allocated by postal authority '],
	[168,'AccountBasedDigitalSignature','A digital signature created by the private part of the private /public key pair supplied by a card issuer to a cardholder and linked to the cardholder\'s account on which the card is issued.'],
	[169,'AccountIdentification1','A series of digits and/or characters used to identify a customer account or relationship, e.g. for the "from" account.'],
	[170,'AccountIdentification2','A series of digits and/or characters used to identify a customer account or relationship, e.g. for the "to" account.'],
	[171,'AccountTypeCode2','Code which identifies the type of account to be updated. Used in conjunction with the Transaction type code as part of the Processing code.'],
	[172,'AdditionalIdentificationType','Type of additional identification offered by cardholder.'],
	[173,'AddressVerificationResultCode','Code which defines the result from the address verification process'],
	[174,'Authentication Method','Method used to authenticate the cardholder'],
	[175,'Authentication Entity','Entity or object in charge of verifying the cardholder authenticity'],
	[176,'Personal identification Number (PIN) data','Used to identify the cardholder at the point of service (see ISO 9564-1).'],
	[177,'PrimaryAccountNumber','A series of digits used to identify a customer account or relationship.'],
	[178,'VerificationData','Additional Data required to support identification of the cardholder '],
	[179,'ProtectedCardData','Sensitive data of the card encrypted with a cryptographic key.'],
	[180,'ExpiryDate','Expiry date of the card'],
	[181,'EffectiveDate','Date as from which the card can be used'],
	[182,'ServiceCode','Services attached to the card, as defined in ISO 7813'],
	[183,'CardCountryCode','Country code assigned to the card by the card issuer'],
	[184,'CardProductProfile','Defines a category of cards related to the acceptance processing rules defined by the acquirer'],
	[185,'CardBrand','Brand name of the card'],
	[186,'AdditionalCardData','Additional card issuer specific data'],
	[187,'CardholderPersonaldata','Identifies personal data related to the cardholder'],
	[188,'CardholderIdentification','Identification of the cardholder involved in a transaction'],
	[189,'ClosePeriod','Indicator for the closure of a reconciliation period.'],
	[190,'POIGroupIdentification','Identifier used to split transaction totals per POI group'],
	[191,'CardProductProfile','Identifier used to split transaction totals per category of cards'],
	[192,'Currency','Criterion used to split transaction totals per currency'],
	[193,'Type','Criterion used to split transaction totals per type of the transaction (debit, debit reverse, credit or credit reverse)'],
	[194,'TotalNumber','Total number of transactions during a reconciliation period per splitting criteria.'],
	[195,'CumulativeAmount','Total amount of a collection of transactions during a reconciliation period per splitting criteria.'],
	[196,'SettlementInstitutionIdentifier','Identifier of the Settlement institution'],
	[197,'MaintenanceTrigger','Used to inform the acceptor to call a maintenance session'],
	[198,'ConversionRate','Rate for conversion between local and billing currency'],
	[199,'CurrencyBilling','Currency of Cardholder Billing Amount'],
	[200,'SecurityRelatedControlInformation','Security related control information for encryption and authentication algorithms']
];

let ISO8583BitMapId={},
	ISO8583BitMapName={};
ISO8583BitMap.forEach((r)=>{
	ISO8583BitMapId[r[0]]={name:r[1],description:r[2]};
	ISO8583BitMapName[r[1]]={id:r[0],description:r[2]};
})

