export function isValid(email : string) : boolean {
    email = email.toLowerCase();
    email = email.trim();
    for (var i=0; i <=email.length;i++) {
        if(email[i]==="@") break;
        if(email[i]=== '(' || email[i]===  ')' || email[i]=== ',' || email[i]=== ':' || email[i]=== ';' || email[i]=== '<' || email[i]=== '>' || email[i]=== '[' || email[i]=== ']' || email[i]=== '\\') {
           return false; }
        if(email.length>320) return false;
        if(email[i]==='"') {
        //Bianca loop
        }
    }
    //test for ..
   //only 1 @
   //can not start with . or end with .
   //can't include these symbols: (, ), ,, :, ;, <, >, ", \
   // Maximum of 255 characters
   //entire email should not exceed 320 characters 
   
   //emoji unicode
   if(email.includes("U+1F")){

       for(let i: number = 0; i < email.length; i++){
           
        let emojiRegex = /\p{Extended_Pictographic}/gu;
        //let matches = email.match(emojiRegex); 

        if(checkBack(email) === true && email[i] === "."){
            if(email[i++].match(emojiRegex)){
                return false;
            }
        }
        return true;
           
        //    if(checkBack(email[i]) === '.'){
               
        //     }

        }
    }

     //inverted comma's section

    for(let i: number = 0; i < email.length; i++){
        if(email[i] === '"')
    }

   
    
    return true;
}


function checkBack(email:string) : boolean {
    const atIndex = email.indexOf('@');
    const backPart = email.substring(atIndex, email.length -1);

    if (backPart.endsWith('.') || backPart.startsWith('.')) {
        return false;
    }
    if (backPart.includes('..')) {
        return false;
    }

    // //finde first dot, substr sfter dot check emoji
    // if(backPart.includes(".")){
        
    // }

    return true;
}


