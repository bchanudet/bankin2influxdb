import Logger from "bunyan";

export interface Bank {
    name: string,
    accounts: Account[]
}

export interface Account{
    name: string,
    balance: number,
    currency: string
}

export class emailParser{
    
    constructor(
        private logger: Logger,
    ){

    }
    
    public parseHtml(html: string) : Bank[]{
        const banks : Bank[] = [];

        const regex = /(?:<td colspan="3"[^>]+>\s+([^<]+)\s+<)|(?:<a class="bigText"[^>]+>\s+([^<]+))|(?:>\s+([0-9\s,]+)([^<]+)<img[^>]+fleche@3x)/igus;

        let matches;

        while ((matches = regex.exec(html)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (matches.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            
            const [, bank, account, balance, currency] = matches;

            this.logger.trace("treating match", bank, account, balance, currency);

            if(bank !== undefined && bank.trim().length > 0){
                const formatted = bank.trim()
                if(banks.length == 0 || banks[banks.length-1].name !== formatted){
                    banks.push({
                        name: formatted,
                        accounts: []
                    });
                }
            }
            if(account !== undefined){
                const formatted = account.trim();
                const bank = banks[banks.length-1];
                if(bank.accounts.length == 0 || bank.accounts[bank.accounts.length-1].name !== formatted){
                    banks[banks.length-1].accounts.push({
                        name: formatted,
                        balance: 0,
                        currency: ""
                    });
                }
            }
            if(balance !== undefined){
                const cents = parseInt(balance.trim().replace(/\s|,|\./iug, ""));
                if(banks[banks.length-1].accounts.length > 0){
                    banks[banks.length-1].accounts[banks[banks.length-1].accounts.length-1].balance = cents;
                }
            }
            if(currency !== undefined){
                if(banks[banks.length-1].accounts.length > 0){
                    banks[banks.length-1].accounts[banks[banks.length-1].accounts.length-1].currency = currency.trim().replace(/\s|,|\./iug, "");
                }
            }
        }
        
        return banks;
    }
} 