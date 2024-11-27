use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("9gUWiVPnEXmYrqe9KStaqSzq6spyqGhMpCRxVLEGk54N");

#[program]
pub mod solana_token_transfer {
    use super::*;

    // 初始化代币
    pub fn initialize_token(ctx: Context<InitializeToken>,name: String, symbol: String, decimals: u8,) -> Result<()> {
        msg!("Initializing token with name: {}, symbol: {}", name, symbol);
        let token_info = &mut ctx.accounts.token_info;
        token_info.name = name;
        token_info.symbol = symbol;
        token_info.decimals = decimals;
        token_info.mint = ctx.accounts.mint.key();
        token_info.authority = ctx.accounts.authority.key();
        msg!("Token initialized successfully"); 
        Ok(())
    }

    // 铸造代币
    pub fn mint_token(ctx: Context<MintToken>,amount: u64,) -> Result<()> {
        msg!("Minting {} tokens", amount);
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;
        msg!("Tokens minted successfully");
        Ok(())
    }
    // 查询代币余额
    pub fn get_balance(ctx: Context<GetBalance>) -> Result<u64> {
        let balance = ctx.accounts.token_account.amount;
        msg!("The balance of the account is: {}", balance);
        Ok(balance)
    }

    // 转账代币
    pub fn transfer_token(ctx: Context<TransferToken>,amount: u64,) -> Result<()> {
        msg!("Transferring {} tokens", amount);
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.from.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;
        msg!("Tokens transferred successfully"); 
        Ok(())
    }

    // 销毁代币
    pub fn burn_token(ctx: Context<BurnToken>,amount: u64,) -> Result<()> {
        msg!("Burning {} tokens", amount);
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;
        msg!("Tokens burned successfully");
        Ok(())
    }
}

// 代币信息账户结构
#[account]
pub struct TokenInfo {
    pub name: String,      // 代币名称
    pub symbol: String,    // 代币符号
    pub decimals: u8,      // 小数位数
    pub mint: Pubkey,      // 铸币账户地址
    pub authority: Pubkey, // 管理员地址
}

// 初始化代币的账户验证结构
#[derive(Accounts)]
#[instruction(name: String, symbol: String, decimals: u8)] 
pub struct InitializeToken<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 1 + 32 + 32
    )]
    pub token_info: Account<'info, TokenInfo>,
    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = authority.key(),
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

// 查询余额的账户验证结构
#[derive(Accounts)]
pub struct GetBalance<'info> {
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
}

// 铸币的账户验证结构
#[derive(Accounts)]
pub struct MintToken<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// 转账的账户验证结构
#[derive(Accounts)]
pub struct TransferToken<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// 销毁代币的账户验证结构
#[derive(Accounts)]
pub struct BurnToken<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}