export function isValid(email : string) : boolean {
    email = email.toLowerCase();
    email = email.trim();
    if (((email.match(/@/g) || []).length !== 1) || (email.match(/\s/g) || []).length) {
        return false;
    }
    
    if(email!=='${string}@${string}.{string}') {
        return false;
    }

    //test for ..
   //only 1 @
   //can not start with . or end with .
   //can't include these symbols: (, ), ,, :, ;, <, >, ", \
   // Maximum of 255 characters
   //entire email should not exceed 320 characters 
   
   //need a loop to test many emails
//    for(let i: number = 0; i < email.length; i++){

//    }
    
    return true;
}
