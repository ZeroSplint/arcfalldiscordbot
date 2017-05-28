// Import the discord.js module
const Discord 		= require('discord.js');
const request  		= require('request');
const cheerio  		= require('cheerio');

urls 						= [];
lastuserlist 				= [];
lastcommandlist 			= []; 
recipeKeyList 				= []; //Store key words to compare with
recipeCategoryList 			= []; //Store recipe categorylist
usersWaitingForCommandList  = []; //Store username + found categories awaiting input  

// Create an instance of a Discord client
const client = new Discord.Client();

// The settings of your bot 
const prefix = '!';

const arcfallwikibotusername 		= "arcfallwikibot"; //username of the bot
const arcfallwikibotdiscriminator   = "3281"; //Unique identifier in combination with username

const wikiURL = "https://arcfall.gamepedia.com/";
const recipeCategory = "Category:Recipes";

const countdowntime = 10000; //10 seconds
const getDataTimeOut = 1000; //1 second ; Default = 50 seconds (50000)

client.login(process.env.BOT_TOKEN);

client.on('ready',() => 
{
	generateRecipeLists(recipeCategory); // Grab recipes from wiki and fill recipeKeyList and recipeCategoryList

	console.log('Arcfall Discord Bot now Online');		
});

client.on('message', msg => {
  
var message = msg.content.toLowerCase();
  
	if(msg.author.username != arcfallwikibotusername && msg.author.discriminator != arcfallwikibotdiscriminator) 
	{
		var userInWaitingList = isUserInWaitingList(msg); // [true / false , array[author , recipe choices] ]		
		if (userInWaitingList[0]) // Is user in the waiting list yes or no
		{			
			if (cleanRequest(msg.content).trim().includes("exit") || cleanRequest(msg.content).trim().includes("stop") || cleanRequest(msg.content).trim().includes("quit") || cleanRequest(msg.content).trim().includes("done")) 
			{
				//Remove user from list await new search result
				for (i = 0; i < usersWaitingForCommandList.length; i++) 
				{
					userWaitingArray = usersWaitingForCommandList[i];
					console.log("USER WAITING ARRAY = " + userWaitingArray);

					user = userWaitingArray[0];

					if (user.username == msg.author.username && user.discriminator == msg.author.discriminator ) 
					{
						usersWaitingForCommandList.splice(i,1);
						msg.reply("Exiting search menu, type !recipe <name> for new search");
						break;
					}
					else 
					{
						console.log("USERNAME" + user.username);
						console.log("DISCRIMINATOR" + user.discriminator);
					}		
				}
			}
			else 
			{
				//Clean up content and check if integer
				var userIntegerSelection	= cleanSelection(msg.content);

				var userchoicearray 		= userInWaitingList[1];
				var user 					= userchoicearray[0];
				var recipeChoices 			= userchoicearray[1];

				userIntegerSelection = parseInt(userIntegerSelection);

				if (Number.isInteger(userIntegerSelection)) 
				{
					console.log("RECIPECHOICES = " + recipeChoices.length);
					if (userIntegerSelection <= 0 || userIntegerSelection > recipeChoices.length)
					{
						msg.reply("Invalid choice, please try again");
					}
					else 
					{
						console.log("Correct Choice");	

						getData(msg , recipeChoices[userIntegerSelection - 1], "");					
					}
				}	
				else 
				{
					msg.reply("Invalid choice, please try again");
				}			
			}
		}
		else 
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
							var requestNoCommand = "";

							if (message.substring(message.length - command.length, message.length) != command) 
							{
								requestNoCommand = cleanRequest(message.substring(8 , message.length));
								request = cleanRequest(message.substring(8 , message.length) + " " + command);
							}
							else 
							{
								request = cleanRequest(message.substring(8 , message.length));
								requestNoCommand = cleanRequest(message.substring(8 , message.length));
							}				
							getData(msg , request , requestNoCommand);				
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
	} 
});

//---------------------------------------------------------------//

function isUserInWaitingList(msg) 
{
	if (usersWaitingForCommandList.length <= 0) 
	{
		return [false];
	}
	else 
	{
		for (i = 0; i < usersWaitingForCommandList.length; i++) 
		{
			array = usersWaitingForCommandList[i];

			if (msg.author.username == array[0].username && msg.author.discriminator == array[0].discriminator) 
			{
				return [true , usersWaitingForCommandList[i]];
			}			
		}		
	}
}

function searchRequest(recipeName) 
{	
	var recipeResultList = [];
	var includesList = [];
	var cleanRecipeName = cleanRequest(recipeName);	

	for (var i = 0; i < recipeKeyList.length; i++) 
	{		
		if (cleanRecipeName.includes(recipeKeyList[i])) 
		{
			includesList.push(recipeKeyList[i].toLowerCase());
		}
	}

	for (var i = 0; i < recipeCategoryList.length; i++) 
	{
		for (var b = 0; b < includesList.length; b++) 
		{			
			if (recipeCategoryList[i].includes(includesList[b])) 
			{
				recipeResultList.push(recipeCategoryList[i].toLowerCase());
			}	
		}
	}

	var uniqueRecipeList = getUniqueList(recipeResultList);

	if (recipeResultList.length <= 0) 
	{
		return false;
	}
	else 
	{
		return uniqueRecipeList;
	}
}

function generateRecipeLists(recipeCategory) 
{
	request(wikiURL + recipeCategory , function(err , resp , body) 
	{	
		var data = [];	
	
		if (!err && resp.statusCode == 200) 
		{	
			var $ = cheerio.load(body);

			list = [];
			var subcategories = $('#mw-pages > .mw-content-ltr > .mw-category > .mw-category-group li').each(function()  
			{					
				list.push(cleanRequest($(this).text().trim()));						
			});

			recipeCategoryList = list;

			for (var i = 0; i < list.length; i++) 
			{
				var splitString = list[i].split(" "); //Splits String			

				for (var b = 0; b < splitString.length; b++) 
				{
					recipeKeyList.push(cleanRequest(splitString[b]).toLowerCase());
				}
			}			
			recipeKeyList = getUniqueList(recipeKeyList);			
		}
		else 
		{
			console.log("Error could not load category page");			
		}

			console.log(recipeKeyList);
			console.log(recipeCategoryList);			
	});	
}

//---------------------------------------------------------------//

function getUniqueList(list) 
{
	return list.filter(function(elem, index, self) 
	{
		return index == self.indexOf(elem); // Clears list of duplicates
	});
}

function getData(msg , recipeName, requestNoCommand) 
{	
	console.log("Recipe name = " + recipeName);	

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
				recipeName = $('#recipe_name');
				recipeNameText = recipeName.text().trim();
							
				data.push("\n" + recipeNameText + "\n");				
				
				requiresHeader = $('#requiresHeader');
				requiresHeaderText = requiresHeader.text().trim();
							
				profrequired = $('#prof_required');
				profrequiredText = profrequired.text().trim();				
				
				profLevel = $('#prof_level');
				profLevelText = profLevel.text().trim();			
				
				requiresString = requiresHeaderText + ":" + " " + profrequiredText + " (" + profLevelText  + ")";
				data.push(requiresString + "\n");	
												
				//var stationHeader = $('#stationHeader');
				//var stationHeaderText = stationHeader.text().trim();						

				stationString = "";
				station = $('#station').each(function()  
				{					
					stationString += $(this).text().trim() + " , ";						
				});				
				data.push("Craft at" + ": " + stationString + "\n");					
				
				usesHeader = $('#usesHeader');
				usesHeaderText = usesHeader.text().trim();		
				data.push(usesHeaderText + "\n");
			
				materialArray = [];						
				material= $('#material').each(function()  
				{					
					materialArray.push($(this).text().trim());				
				});
					
				craftmatamountArray = [];						
				craftmatamount= $('#craft_mat_amount').each(function()  
				{
					
					
					craftmatamountArray.push($(this).text().trim());						
				});				
				
				materialstring = "";
				if (materialArray.length == craftmatamountArray.length) 
				{
						for (i = 0; i < materialArray.length; i++) 
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
						createsHeader = $('#createsHeader');
						createsHeaderText = createsHeader.text().trim();		
						data.push(createsHeaderText + "\n");
						
						createitemArray = [];						
						createitem= $('#create_item').each(function()  
						{
							if ($(this).text() != "") 
							{
								 createitemArray.push($(this).text().trim());
							}								
						});
						
						createitemamountArray = [];						
						createitemamount = $('#create_item_amount').each(function()  
						{
							if ($(this).text() != "") 
							{
								 createitemamountArray.push($(this).text().trim());
							}							
						});
						
						createitemstring = "";
						if (createitemArray.length == createitemamountArray.length) 
						{
								for (i = 0; i < materialArray.length; i++) 
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
			//data.push("Error: wiki page does not exist");			

			if (requestNoCommand.includes("recipe")) 
			{
				requestNoCommand = requestNoCommand.replace("recipe", "").trim();
			}

			var searchrequest = searchRequest(requestNoCommand);			
			
			if (searchrequest != false) 
			{
				usersWaitingForCommandList.push([msg.author , searchrequest]);				
				data.push("Recipes found, select a recipe by typing the number \n");
				data.push("Type: quit , done , exit or stop to return \n");				
				for (i = 0; i < searchrequest.length; i++) 
				{
					data.push(i + 1 + ". "+ searchrequest[i] + "\n");
				}		
			}
			else 
			{
				data.push("No recipes found, try again with a new search");
			}
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
		for(i = 0; i < array.length; i++)
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

function cleanRequest(requeststring) 
{
	requeststring = requeststring.replace(/[^a-zA-Z0-9 ]/g, "");	
	return requeststring.toLowerCase();
}

function cleanSelection(selectionString) 
{
	selectionString = selectionString.replace(/[^0-9]/g, "");	
	return selectionString.toLowerCase();
}