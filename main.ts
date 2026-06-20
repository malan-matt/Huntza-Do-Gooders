

export function isValid(email : string) : boolean {
    email = email.toLowerCase();
    email = email.trim();
    
    if (((email.match(/@/g) || []).length !== 1) || (email.match(/\s/g) || []).length) {
        return false;
    } else if((email!=='${string}@${string}.{string}') || (startsWith(email, '.')) || (endsWith(email, '.')) ){
        return false;
    } else if (email.length >254) {
        return false;
    }
    
    
    

    if (!checkFront(email)) {
        return false;
    }
    //test for ..
   //can't include these symbols: (, ), ,, :, ;, <, >, ", \
   // Maximum of 255 characters
   //entire email should not exceed 320 characters 
   
   //need a loop to test many emails
//    for(let i: number = 0; i < email.length; i++){

//    }
    
    return true;
}

export function validChars(email:string) {
    var invalidChars = ['(', ')', ',', ':', ';', '<', '>', '[', ']', '\\', '"'];
    for (var i = 0; i < invalidChars.length; i++) {
        if (includes(email, invalidChars[i])) {
            return false;
        }
    }
    for (var i =0; i < email.length;i++) {        
        if(email[i]==='.' && email[i+1]==='.') {
            return false;
        }
    }
    return true;
}

function checkFront(email:string) : boolean {
    const atIndex = email.indexOf('@');
    const frontPart = email.substring(0, atIndex);

    if (endsWith(frontPart, '.') || startsWith(frontPart, '.')) {
        return false;
    }
    if (includes(frontPart, '..')) {
        return false;
    }

    return true;
}

function endsWith(email:string, suffix:string) : boolean {
    if (email.length < suffix.length) {
        return false;
    }
    return email.substring(email.length - suffix.length) === suffix;
}

function startsWith(email:string, prefix:string) : boolean {
    if (email.length < prefix.length) {
        return false;
    }
    return email.substring(0, prefix.length) === prefix;
}

function includes(email:string, char:string) : boolean {
    for (let i = 0; i < email.length; i++) {
        if (email[i] === char) {
            return true;
        }
    }
    return false;
}