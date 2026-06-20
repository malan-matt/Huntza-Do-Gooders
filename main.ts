export function isValid(email : string) : boolean {
    email = email.toLowerCase();
    email = email.trim();
    
    if (((email.match(/@/g) || []).length !== 1) || (email.match(/\s/g) || []).length) {
        return false;
    }
    
    if((email!=='${string}@${string}.{string}') || (email.startsWith('.')) || (email.endsWith('.')) ){
        return false;
    }

    var invalidChars = ['(', ')', ',', ':', ';', '<', '>', '[', ']', '\\', '"'];
    for (var i = 0; i < invalidChars.length; i++) {
        if (email.includes(invalidChars[i])) {
            return false;
        }
    }
    
    var front = email.split('@')[0];
    var back = email.split('@')[1];

    
    //test for ..
   //only 1 @
   //can not start with . or end with .
   //can't include these symbols: (, ), ,, :, ;, <, >, ", \
   // Maximum of 255 characters
   //entire email should not exceed 320 characters 
   
   //need a loop to test many emails
    
    return true;
}
