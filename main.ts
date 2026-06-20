
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
    
    if((validChars(email)===false) || (checkFront(email)===false)) return false;

    //test for ..
   //can't include these symbols: (, ), ,, :, ;, <, >, ", \
   // Maximum of 255 characters
   //entire email should not exceed 320 characters 
   
   //emoji unicode
   /*
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

   
    
    return true;
}

export function validChars(email:string) {
    var invalidChars = ['(', ')', ',', ':', ';', '<', '>', '[', ']', '\\', '"'];
    var k=0;
    for (var i = 0; i < invalidChars.length; i++) {
        if (includes(email, invalidChars[i])) {
            for(var j=0; j<email.length;j++) {
                if(email[j]==='"') k++;
                if(k%2!== 0) return false;
            return true;
            }
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

    // //finde first dot, substr sfter dot check emoji
    // if(backPart.includes(".")){
        
    // }
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