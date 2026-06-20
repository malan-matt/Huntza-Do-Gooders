export function isValid(email : string) : boolean {
    email = email.toLowerCase();
    email = email.trim();

   //test for ..
   //only 1 @
   //can not start with . or end with .
   //can't include these symbols: (, ), ,, :, ;, <, >, ", \
   // Maximum of 255 characters
   //entire email should not exceed 320 characters 
   
   //need a loop to test many emails

    return true;

}