// Import the discord.js module
const Discord 				= require('discord.js');
const request  				= require('request');
const cheerio  				= require('cheerio');

urls = [];
lastuserlist = [];
lastcommandlist = [];

// Create an instance of a Discord client
const client = new Discord.Client();

// The settings of your bot 
//const settings = require('./settings.json');

const prefix = '!';

const wikiURL = "https://arcfall.gamepedia.com/";

const countdowntime = 10000; //10 seconds
const getDataTimeOut = 1000; //1 second ; Default = 50 seconds (50000)

client.login(process.env.BOT_TOKEN);

client.on('ready',() => {
	console.log('Arcfall Discord Bot now Online');		
});

client.on('message', msg => {
  
  var message = msg.content.toLowerCase();
  
  if(msg.author.username != "arcfallwikibot") 
  {
	if (msg.channel.name == "wiki" || msg.channel.type == "dm") 
	{	
	 	
		if  (message.startsWith(prefix)) 
		{
			switch (message) 
			{	
			// !wiki
			
				case "!wiki":				
				
					if (!findObject(lastcommandlist , "!wiki")) 
					{
						msg.reply("https://arcfall.gamepedia.com");
						lastcommandlist.push("!wiki");						
						
						setTimeout(timeout(lastcommandlist , "!wiki") , countdowntime);	
					}			
					else 
					{
						console.log("Console command: " + "!wiki" + " timed out");
					}
				break;					
			}			
			
			// !recipe
			
			console.log(message.substring(0 , 8));
			
			var command = "recipe";
			
			if (message.substring(0 , 7) == (prefix + command) && message.length > 8) 
			{				
				if (!findObject(lastcommandlist , (prefix + command))) 
				{		
					var request = "";
			
					if (message.substring(message.length - command.length, message.length) != command) 
					{
						request = cleanRequest(message.substring(8 , message.length) + " " + command);
					}
					else 
					{
						request = cleanRequest(message.substring(8 , message.length));
					}				
					getData(msg , request);				
					lastcommandlist.push(prefix + command);
					
					setTimeout(timeout(lastcommandlist , prefix + command) , getDataTimeOut);	
				}			
				else 
				{
					console.log("Console command: " + prefix + command + " timed out");
				}
			}			
		}
	}
	else 
	{
		console.log("Did not speak in #wiki or direct message");
	}
}  
  
});

//---------------------------------------------------------------//

function getData(msg , recipeName) 
{	
	request(wikiURL + recipeName , function(err , resp , body) 
	{	
		var data = [];	
	
		if (!err && resp.statusCode == 200) 
		{	
			var $ = cheerio.load(body);
			
			if ($('#recipetable').length <= 0) 
			{
				data.push("Could not find recipe");
			}	
			else 
			{
				var recipeName = $('#recipe_name');
				var recipeNameText = recipeName.text().trim();
							
				data.push("\n" + recipeNameText + "\n");				
				
				var requiresHeader = $('#requiresHeader');
				var requiresHeaderText = requiresHeader.text().trim();
							
				var profrequired = $('#prof_required');
				var profrequiredText = profrequired.text().trim();				
				
				var profLevel = $('#prof_level');
				var profLevelText = profLevel.text().trim();			
				
				var requiresString = requiresHeaderText + ":" + " " + profrequiredText + " (" + profLevelText  + ")";
				data.push(requiresString + "\n");	
												
				//var stationHeader = $('#stationHeader');
				//var stationHeaderText = stationHeader.text().trim();						

				var stationString = "";
				var station = $('#station').each(function()  
				{					
					stationString += $(this).text().trim() + " , ";						
				});				
				data.push("Craft at" + ": " + stationString + "\n");					
				
				var usesHeader = $('#usesHeader');
				var usesHeaderText = usesHeader.text().trim();		
				data.push(usesHeaderText + "\n");
			
				var materialArray = [];						
				var material= $('#material').each(function()  
				{					
					materialArray.push($(this).text().trim());				
				});
								
				
				var craftmatamountArray = [];						
				var craftmatamount= $('#craft_mat_amount').each(function()  
				{
					
					
					craftmatamountArray.push($(this).text().trim());						
				});				
				
				var materialstring = "";
				if (materialArray.length == craftmatamountArray.length) 
				{
						for (var i = 0; i < materialArray.length; i++) 
						{
							if (materialArray[i] != null && craftmatamountArray[i] != null) 
							{
								materialstring += (craftmatamountArray[i] + " " + materialArray[i] + "\n");
							}							
						}
				}							
				data.push(materialstring);
				
				//--------------------------------------------------------------
				
				if ($('#createsHeader').length > 0) 
				{
						var createsHeader = $('#createsHeader');
						var createsHeaderText = createsHeader.text().trim();		
						data.push(createsHeaderText + "\n");
						
						var createitemArray = [];						
						var createitem= $('#create_item').each(function()  
						{
							if ($(this).text() != "") 
							{
								 createitemArray.push($(this).text().trim());
							}								
						});
						
						var createitemamountArray = [];						
						var createitemamount = $('#create_item_amount').each(function()  
						{
							if ($(this).text() != "") 
							{
								 createitemamountArray.push($(this).text().trim());
							}							
						});
						
						var createitemstring = "";
						if (createitemArray.length == createitemamountArray.length) 
						{
								for (var i = 0; i < materialArray.length; i++) 
								{	
									if (createitemArray[i] != null && createitemamountArray[i] != null) 
									{
										createitemstring += (createitemamountArray[i] + " " + createitemArray[i] + "\n");											
									}	
								}
						}	
						data.push(createitemstring);	
				}
			}			
		}
		else 
		{			
			data.push("Error: wiki page does not exist");
		}
		msg.reply(data);
	});
}

function timeout(array , object) 
{
	return function() 
	{
		for(var i = 0; i < array.length; i++)
		{
			if (array[i] === object) 
			{ 
				array.splice(i, 1); 
			}
		}		
		console.log(object + " no longer timed out");		
    }	
}  

function findObject(array , object) 
{
	var returnValue = false;
	
	if (array.length <= 0) 
	{
		returnValue =  false;
	}
	else 
	{
		for(var i = 0; i < array.length; i++)
		{
			if (array[i] === object) 
			{
				returnValue = true;
			}
			else 
			{
				returnValue = false;
			}
		}	
	}
	return returnValue;	
}

function cleanRequest(request) 
{
	request = request.replace(/[^a-zA-Z0-9 ]/g, "");	
	return request;
}