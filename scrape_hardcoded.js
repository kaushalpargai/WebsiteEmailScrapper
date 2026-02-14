const { chromium } = require('playwright');
const fs = require('fs');

// --- HARDCODED CHANNEL LIST ---
const CHANNEL_IDS = [
    "UCTBw1u6rtKrd8hJwQzme80g", "UCNXpIkVtRf4TemtBa8PQvEA", "UCIJa7fbgKLyOnVC3AN6gP_Q", "UCkw63Cy1o2mGRvbtsifBE0w",
    "UCEI5ubJ1Dq0pyfVysKsLK6g", "UCImT_-YsRBvo9SugutpBvFw", "UCyE41I6fSzvQr6gC0k2gtyA", "UCccTnAZpgcAtybWn-mwfC-w",
    "UC4Bycfo3gb5Nh-tJ3SN91Mg", "UCMP5tJa5SE5VeGUSN90BrJw", "UCtTxr1aq8Bd6MvloZRNEQPA", "UCRerTTrGSOEDMY4vak5jW4A",
    "UCMktCjtighbxcYbiNx3qtQA", "UCdjqzqR0LlL20Lsg_afuSuw", "UCJFFpO8yeHacJuV8ZAPzmMQ", "UCjfUKTtJ1WnW-K4ctdBqPaQ",
    "UCjLvB4tn7BmIYtCDXm6ADSQ", "UCiMzdLBTuLAQjQDsUV8x8yw", "UCi8q0DWBD8Jg1jBZu-98vSQ", "UChr0fm-UJvFF5gbUzRiATpQ",
    "UCHg9NnD-HQQxaiuPpNd7WrA", "UCgtTFMI5xSI24loDGZl1K1Q", "UCGwB6rIz4VtfxV1U0Nn5XUA", "UChhjUEYaPXLDWNd8m0lB7TQ",
    "UClargqRt42TCNePY4nhwFfQ", "UCl3AWtKcBYTZ1A4ZXxN3SqA", "UCLMyRECuk2Is4v8FEly-SSg", "UCKpYBOPisH_9ccM8_Jr_FGQ",
    "UCdmzcOQgDcfcrntc6qgGsYQ", "UCDANb7oOKyWGp0yl3qCfI8g", "UCDXsLnx_0TsNuMYMz4CANdQ", "UCFnMI1mFehPS9VevdrxjeSg",
    "UCTmjOGcBk-5jNvvDsOPxrEQ", "UCuT27yFMd66U4Cz2C2S-ZVg", "UCqLH33_plkkf--5Naa4VaZQ", "UCn7JgrRe2fxgGI1DBAFpG1A",
    "UCrU99UvDErrCkHOD2FJIFcQ", "UCRv120ArCGs_ifIcfi0izgw", "UCRyDwb_qIWoP0il6Cx2vHnQ", "UCPLPpNoA1hiHs0id9gSnw8g",
    "UCpmfETcYrrkndUGJEoGkSCQ", "UCoYFxq8HKqxZwk3i4Ihx60g", "UCp0yqwq9ss1xoZ2WkU1b2nA", "UCpbA778AuHjijxhjh2GGaQQ",
    "UCtF0tFnI6bW1fNHsF0V2TZw", "UCsUbNK7BIpXDFMwPT-3XjAQ", "UCxq8Ko_5ZFxHTBtk_svXsTA", "UCYPqcSmhAIhvB5j0K9Djshg",
    "UCWVakJKiz5GTp1vBYre_9vQ", "UCWNQKR5PTeMN25wos7wbesw", "UC3ev4_pFjtDekgP7h7nXAEQ", "UC7MJv5VSsdgeFnJ9udWeyeQ",
    "UC03KeNDQx158r5pqXNhX0TQ", "UC_23xrHNauv1ef-RREE9YRQ", "UC_ajU5e65PySkd6uTbsUiig", "UC_pexIe1XjijR1a_n2Khj0g",
    "UCc9dHadl9jfduSlkeKZVpOw", "UCcfaBqYFlrPXZd9FG2eYw6A", "UCbnQrK-Ke8qSM88DCfUStpA", "UCBuNEfCn1zNoYwBeJDBRIhA",
    "UC2uHjptaJp4QjAMJJX3TwsQ", "UC0w09TnpKi7vFprjhZ9FOeg", "UC2MGOIQNzvCJAEM3mCzypdg", "UC1rN784suSSYLOQv5lxCndw",
    "UCbIijl40HWa5jiQMkseVAKA", "UCasqOys8D45KAR4FvrlWZsA", "UC87jTsWrIx6WbKGi0GSJyxQ", "UC-X7q6VBC5D-1Zd8DbQjKLA",
    "UC0iNFz6mvX1EmHEK9hgspdg", "UCcK-cWCth-qCjsFfx-RG9mw", "UCqLbTAc5Mn2cJDu1-FZ2W3g", "UCQPvKJhKfGfPeTfK-FQQXyA",
    "UCq0cj8G-DMfQlSD-4Lt8rrQ", "UCUAJval5l4FkAjuY_CGL37Q", "UColr7f3iloMnIcBMTC0a8Gw", "UCNU5tAcsbrdyVgRGukpylnw",
    "UCnhsepcwWakd52HrU_FknkA", "UCr1VqycoNRjR_P11LrhMMbQ", "UCGqSvCWfzJ1i1u4_qgFJwng", "UCiHqo0ujEjNLFTyElipGHww",
    "UCXsa1nOVbmruFyrwjRfRnmQ", "UCYSuToC4nHyCyffsW0g0O1g", "UCYUufDuTHSNrM1e8c9YE6hA", "UCfjOEDtnsF5kDPFsVwIKf0g",
    "UCvmXkENo367GHP0YZ9unFwQ", "UCuzGIxIx9A0wdVGQ9kcH0ew", "UCzrR1Q35soGX_gh6kJZpR8A", "UCt_7UdSSOiPiG7kMt53rRlg",
    "UC6IBhwGv5tUMU3YPpKy2DoA", "UC6sQgW0qiRh0uzVrWOKjZzA", "UC62MCW-UsnNqTwkqQcwqH-Q", "UC-hNOS1vDpbVlilZOMzufYQ",
    "UC1qMMZo_6klkIB9860MsohQ", "UCgBr588sinxi2heEVa4OXAQ", "UCfBkzAvx7_fEiJ2rfChydYQ", "UCfBkU6e0_XMvBt_yODJmfBg",
    "UCRkoTFLgxYFALMaQF_mvRQg", "UCQmJk0ErE_FiorcLBsDKORA", "UCqO_4ZGldRnBFmT0pX6gFGw", "UCQesOAtxBikEScvMiOHF7Ig",
    "UCqzYGw4dHL-TX4-cMGSw0GQ", "UCMZ7j0gDfaXYjzQ-L4T_EGA", "UCJmYGtyQ9y_C0enEz0qbdQw", "UCJPGW-jsBHb22QLsHLKpVmQ",
    "UCGYGgjA06xBAbX4d0UMGEJg", "UCdEFSBd5azdDG_qx4IDhFbg", "UCjo2z7csP_R5qmVch7NUzVA", "UCfqAOPJ-UOFmTIOve_q52Cw",
    "UCWK4OO8sFWlPQQ-16usFPxw", "UCX57Q4c_mXDJO7JuG-xQIRA", "UCVD_T-Aoupeyxk_vDj9Y1vA", "UC6ccIADq_6gqr6nIa3daXSg",
    "UC17mcmhzIMKXf_VBSoLcY4g", "UCDEsd1fJ483x2WxTvKm2sqA", "UCppGi1dRsHUbdjpdLWIY4cw", "UCpxcCYyrSmc056ZmEShxPpw",
    "UCqTk4ozkdlOH3T_KJwWRGTA", "UCMidtBECQWdKrn8K0qvT0EA", "UCDO4w1TnOaSJPko-EmogU1g", "UCGGLZNaH_tJkKMtqxkWBCuQ",
    "UCgHURGM3AY5wksSbsV3bdeQ", "UC6aBaksRnp9I3YsPP9N0uYA", "UC2NXq0GBqb0OPDHpkZZl7vQ", "UCUSTToIfj1JeU9OrR1jTuxQ",
    "UCWsCxxmzejYMGbys6E5qqpw", "UCQ08JkjA2CsL6LnPMt_GViQ", "UCPrx7rlBQV1hzgdTz-Uenkw", "UCmPQaTuV-LsP_XfY09ujPUQ",
    "UCP6qcye_g9UgtNuMCF61mqg", "UC8a40BCgmGBlBvKjdYmgOyQ", "UC8UfBPvfCgIuyXUMD3_nlXQ", "UCdGntc2EeG1oa0sHsiPgrWQ",
    "UCI2hFB9GBvdMOgvPPLh6MiQ", "UCjE1pYLsOXu2MtpBGrjSYRg", "UCL4m9xBHaAEb2YXY-BAIA6g", "UCL9PTBWHb7sUlV7ZwVtRK7g",
    "UCx6ChAAqWpQaIT-YEat2xww", "UC_h8HTYPZM9Vl7h_7GzqL3w", "UCJWrG7y_fXjOmrvtl3J8MA", "UCjEFtbsvxSkgyAfqXAP4xtA",
    "UCF2EcefxNUox6NzDAPRfLOQ", "UCl3dQkBUzntUf74Mih1bLBw", "UCsnAq2C58sJgEFVGqY_-opg", "UCMSjgfg2tY724_6tg2-xWrw",
    "UCmzwJ4PHWXacu7Tem7muDRw", "UClX5wvUsWmQjjSlge0EZJiQ", "UCJ9yzMzuAwYoc4UNdh7CcTg", "UC5ACEiVpqeyeXhZIeDpLBTA",
    "UCPP6FeJoc67VVCXxh2zeJNg", "UCQSr7-OnjKm--AGrbupYiKw", "UCPV29BcUFLhySr43O6zokkw", "UCq3_4fQAMUiq_JysR7KBOtQ",
    "UCoUPXRhelBnVmopIW_HGyfQ", "UCR1-dc60LigCF9AhGcEUDZA", "UCm6fiGF9vfW-FsMOYYNNfcQ", "UC56mdwIyu0M-5286aO143Aw",
    "UC4mXU4z6je5DQlzGb2-bz3w", "UC_hMrYCwQOHFUGIbg5YeRrA", "UC0GZCrNtfHyyqfJfaMQ_XXw", "UCcHT9whF6K5cPnA2B-MONGg",
    "UCB4q1QU1aEmGIEYKKlGCpqw", "UC8Cpjxq9OA-WkYN7iRa6nlA", "UC9XvLgK3M3x69FTIu6ideXA", "UC1DSiIMYsxlLg_yzvGFghfA",
    "UC5wDZGguiR2jxTE7C615SiQ", "UCwuHVv12cVSjF1KQQv4cobQ", "UCWmHUoaETaVrWtdxlW4_FTw", "UCVOf2LAhm4FUZguAAxD0Bmg",
    "UCvI_GJkQt7IxTkVNT8bERpQ", "UCv1GPyrDonyw8RsBTI3S8Xg", "UCY9zRcxOzchNjEbqZiobXEg", "UCY-a_nCm-2H0ofDbmemaneA",
    "UCiLOQg4y4yttkcpI3AtOn4g", "UCjVWSQhd_aRody0ihCOY32w", "UCJziNEN4ALJzKTT6lM3vMng", "UCGMf2Z4bfFiqj4Dg49qFzgQ",
    "UCL6zDvI-J4TFS58h-rrTeIA", "UCKl7vy3VrwptGtCIYit82Kw", "UClGIPBhP3yCEMMzz7h1g73A", "UCEAhEB73XSZpDOR27Bv0sUA",
    "UCgsmHy7l9y0xPfHWZWR57IQ", "UCKFYQgeg6LIkm3buwZNQgNQ", "UCDsw-fpVXvdcmpkqKY8M8AQ", "UCFh5CdepIK7SQ4NmCKFZysA",
    "UCLIOnChEBnm7XJp0fItfjfQ", "UCL5ChoNS0C0NsVTwEIpXFyQ", "UCbYli864NfAxvdwAAPODMyg", "UC0D10UroYBL3qGO-NocrvxA",
    "UC-ERH8AJmIe3w0Xcby27gVw", "UCMciVwe_mp86hOTNBHcl9eQ", "UCOYO3aGLstUQQEGsy8PHU-g", "UCQKOtg9LwLxoaA1kdpqR8hA",
    "UCURiW1zSiXSQJcxOd2UonLQ", "UCnBiXWPI1FXXGwo9EeUQT7w", "UCnwXo3zQwkoBLDBTRxLdaqA", "UCSDti-vbKpDbTqTZB1OCazA",
    "UCWq3Ic1F_1jnkQt8H_6hMgw", "UCxA4HjuMPaU3FKZERJTu_lw", "UCHUftyhuJrerVx9yWntJUdA", "UCJN_IdT5o8-zTdW4tNOQvxw",
    "UCZp2_wowlFdOBpPloa1Bc2w", "UCB4oGLJFznVD2XkxhFkEa4A", "UCaHd7dTU9_6xVwAFHLdmqYw", "UCpwKWcahqZCJU-h-E9J2m-A",
    "UCLZuPScvI6n8eCqSq3qVe7Q", "UCxW5XahrswR6WyXuGjd1piA", "UCVEkev3qowJv61kBGaW-7Ww", "UCK5b-Kff3AgzUBsWM_ONMuQ",
    "UCiCTkAwMy3SAAM0_GIgAAHQ", "UClElkZp880TKQqkN_n1JngA", "UCEpMccO7k-dv9FpGTNjVNUw", "UCaQoiT1hkSP4mD0p3uA6NOw",
    "UC4NiDoV298cFmaW-hkYeuwg", "UC5M_YDFHp_mAJgFmOHoiuYg", "UC7hamTaDX0I6efnIIfkAPPQ", "UC8oy54SFnZBEhMavy6jcguQ",
    "UC26-c7pz96UmPhefpTLmQvQ", "UC2Tf6MHEg3ma4OSYMIEfIDA", "UC3igbOfjItm-Ea21KzLKtig", "UCANJFvTbu4_Y2PJb8a0LvBw",
    "UC-YS4_7ShNFpv3LqVlGJCsQ", "UCqHufTwd2MTHc_H_I3McMcw", "UCsDm1cJdsLhn6ybEt0idIWQ", "UCEBL75OjP_OwFHG-q25Oobw",
    "UCz1v-oGZFvVUkKrhWHdjFgA", "UCtH6MqBOn2ZE1Bz1KBzHHPw", "UCOGREfjdFDR2hWcX1MWS0Kg", "UC5h7x1GCB2decPf18HqBfew",
    "UC0vOGbtRj53YHJm_dkNaXOg", "UC7IBL-9ZBaElmhTFj1-qkhg", "UCm1sR0VAYHxc2lphwqeMvrw", "UCPsk2FVSKh_SDUUzwGgVE3w",
    "UCEUkm8D108BVn7bott8RvMg", "UCcX0uQBpO3_P3QorsN8kQQA", "UCwxkD8RcCkePqkv26Xym6sw", "UCmw2e3U8HmwTts4QDzD7NMQ",
    "UCpAG_iCjKJ8BK8YHgn9cxCQ", "UC5n9MK5C-I4QHYg-6H_S1mA", "UCBzrR10eD-HBfJPotQrw7oA", "UCc-FazTk4ttTVa8hiZrS7Lg",
    "UC1KJ3dOzMFnqjv2iG7p0Bkw", "UCiuUeAW9FWbMDcqohq00v6Q", "UCjkiarGfGUjnKN2ekNonjpQ", "UCFQWbqm-Ou-GOkQPRGw3TEw",
    "UCj_VllmKDkZGZPhgVNizK6g", "UCejKQB4sIay9pzMcINLG2Kg", "UCOLjQuZ-du4nye_LydnWvCQ", "UCx6jwU1K3qrsJBZhom1AbGA",
    "UC51g50a6tPQuFtl3RzyGCHg", "UCOP9cReNKWJJkfwd-OENBjg", "UC1U-KpyTvxahXnRgyTCTLKA", "UC9tl2qIQWcKMf9UPhiuNAcA",
    "UCIyFtZCfUPKLnwKki6EQcQg", "UCXTWJMlfT8TdlpNkPRCn3pQ", "UCZbpbr6hZ20at46uwmru2Qw", "UCYVr-y4785Gakr-3LDQpGQw",
    "UCvmilbJ62DW4-RhzmTX485w", "UCWGukyFq2P_SYJQQQi-DL-g", "UC7KW48NKblFZAOn0DKZKF_w", "UC2FguXm6aqTxqGIkExXgBhA",
    "UCNaYsuGFehZmEyOdW3rpfMA", "UCO7LLpxVtf72f_ieO3gdAhQ", "UCrEPfL5MMAGLYLwzVld6WoQ", "UCHGlDku-Fzg0wHNlAike8-g",
    "UCEAcSyIQllx38fkPbae60tA", "UCf58CbplZsDbH9wPMYoOTFw", "UCk05tFTELnQwAExoGF_7Dag", "UCCx4YlMpoV-Iil96VqQCtRw",
    "UCDhGPf0ZyNbqYQgAw75FvLQ", "UCUTBj67obe3MOnGz63Elplg", "UCxFyMbBlpr5t9OEmF8IlBCg", "UCRqpQ_1OpEeSeVeH24STyCQ",
    "UCei2CZUIcfGfPqKwjUWMI7g", "UCD94403Uj8IfFoY3Z6wrPDQ", "UCv4JSK9VyCSqi6sBuocs5Qw", "UC2wy0STp05Ld83OsCi-HiBQ",
    "UCQz3noQl0o9F1lPopeMOflw", "UCouGtGIb4IT2bhKhv_A6YDg", "UCWUH8uy_BZjSMj2lJsRtNvQ", "UCRvTTvRgb1dDLHVSmfbekUg",
    "UCFtFb-Wgl2RqSY9THxcXFnA", "UCe8lP9wRH0G8my7mhBkfJQQ", "UCBjOmO_EeXRzNUZdq_ZS2Ew", "UCP1SnOsi4HbJ4_6mSC8c4UA",
    "UCSRQrAzNFaecVmO9v2bu0Dg", "UCQGkpXwISxNDFCE8p7lCsMA", "UCNtAzN0QO20_-7i5vzwJdMg", "UCAHF6N9PSl5w9mv57gaXPbg",
    "UC9Knu7GFMCclsV2AczT0FEw", "UC2r6XBfFuAOZtFcA0FB4Fgg", "UC6Uv5XzFxnZX6jflVpa_3Sw", "UCCE22x5c8auNU4kVW2VgNiw",
    "UCuWbs6nlmGiO9ebLWhIssPw", "UCvd3Gcn04lg8Vwee0Jzdoeg", "UCfa4dvCJAY9SYQbkvpAPI6Q", "UCe2_w0vCnyTHaHZwGMO3wIw",
    "UCjB-zikkh6WlODEZlo501WQ", "UCigcS5A8ZDkws-ROuC3skaA", "UCi2Zz2kcDIAsmcJrvbtwOtA", "UC4SDjSH5Mm3mfw2FgjiHYgw",
    "UCngMu5lnOAs4rVNUUoqFD3w", "UCukVVstV_mBFgFBsLkRJ63g", "UCF3hPmAq7dXJeYtzRhp4Agw", "UCfaXz3ih3YPRKgBWkqedR3A",
    "UCAZYbpvik5Z6OVVmHmcVIcw", "UC4kOnCP1GNs1i5XBGkMWo6Q", "UCLbyplLSkNToQwaXtQctK9w", "UCtfIU2uDOsHV36OQksfQ8wQ",
    "UCocntggFhc2V3kjY6mR4U6g", "UCN6_S8nadld3IJoUbRM9mQw", "UCKA-UmUkOSiMj4XjpjPFyWw", "UC4g9yOr9LaoHJoiU1TILBFg",
    "UCBHZd9mcELW1i972IkH9dkg", "UCbC_SefulGO53jND6eXlNFQ", "UC0ks1Pr-KocGUPMTdHQy_bw", "UC315sjN2IiSKh9loF1uUykw",
    "UClJDo-uM0FAD4hW1Q4KpZ0A", "UCD7rcLz9pP9tfMrx7UMsjUw", "UCEvyDOkcGkzCTo62d9BrhkA", "UChy62_UgmhyXMtj3vxph54w",
    "UCFMI9nuHvypUrhwoy-1P3hQ", "UCMbq5sN82JsJ7X6Tu5NcsGg", "UCp7VeYp-ksjQYlwWlueUisQ", "UCrsJKS1-36M0tD5GBXo5Ejg",
    "UCy3u0IjxE47ipy_sj-kmALA", "UCOUNeYEKacMaaIB4oJyVD6w", "UCpNM3nVIvi6AJWQ0YcO1t2g", "UCueD00rhvIW8H9yDFybGSPA",
    "UCpSLpCnH1E7D4xp1J5z-1nQ", "UCimMv5b6eW7i1jVh0sRk-ug", "UCb1BPlYf4mUFQPzAhusrFKw", "UCa6aTKnOtE9gvw7Pj8DNXYA",
    "UCV6vnMXbe62ZHB7hgmvcfeg", "UCJj1u3LxjKdLmvh0AfSSXSA", "UCJWgplyRA3gzIt236qrPGhg", "UCj_EErvaGQ-FxH0U8EPU4tg",
    "UCp6os98__4CqnMRbYSaasWw", "UC0UBvYd_zQyYxr4EF9h4vPA", "UCjOAkITCR1iAzs-qEHGeJ6g", "UCh-2NzCfo5pcaW2UJ2YbbQA",
    "UCmTIhD3NGdWo04RlF91L4uw", "UCN2UD3xpmmTsa71wTL5NUfw", "UCPMCNLrRjghH2jRLw179UTw", "UCd_pIHE8tQmoanqta8gMsOg",
    "UCfz1wbVXtFLmDaMADA8F_dw", "UCbvHClk6piDRed5vOnl6V4g", "UCaf4g2gN10O8nMQx2bFVXHw", "UCbFhCKc35iI_ualUyHdYeaA",
    "UC_Ogb373G8GSNer0Yh3qJ6Q", "UC0azAG0oqkz8k7ORh6KQbgw", "UCibD6whO_N_RRaRQvVM1LhQ", "UC8RS82VnZbKQHuNrRclIBJQ",
    "UCB7ifBr7cWnrUnmrcSe3kUw", "UC8p90YF0_n3gupa2CX2P_hA", "UCLFgtMRZ8Hks5Um2UaP8FVA", "UCQWg3E4rf9PS1ThMpuTiOuw",
    "UCMys8GSTIzG0I-pEghWKaiQ", "UC4Y1Qcxx4timzfSF0EDaNEA", "UC7gNbh3UUby0eYP_I19hjUA", "UCWrCnH2nQqSkdO4dEygtooQ",
    "UCkWwaQEDVcCUiq8hJLReFrw", "UCrUbXupwrUQoMpigD-K2wUg", "UCr_GiZYfGzmzwdidgKPRWsg", "UCqwklYJTxzEuzKPG6pQ2acw",
    "UChqt57bsOtkjnb_dCNHqY8w", "UCGsz_0FsRJB9FR4UGL8CA3w", "UCeFDUkBdqAz5S7DGL06_jjA", "UCRzDWWCuVsQKve2cgMsfM5g",
    "UCsJd3oh_1pgv5gN7DwYxwqQ", "UCed9oW8ANzTx-4xQ3HkXirg", "UCGavwnItkoAr16lCiP0fxPA", "UC7sa7zbuC3eAaU_b6FuJpxQ",
    "UC8hqmnH6I24KW6QY1ciLpGw", "UC3mQfTrThLl3O1T0cohJmvQ", "UCfmxka_nVNBUebAbIhG1NPA", "UChzy8lv3WC0e04v9nyIEisQ",
    "UCT3had7jf0rgBBxVZxPZnMw", "UCpTgxKG5DGbONu7qVnljXkg", "UCnY8C0l94YujJTF2whsr8wA", "UCOyPArQHLjr8z9QNwE6RXGA",
    "UCMxoigKRmM-TokKnKcFZXCQ", "UCX1zHWgFbkpRxiVbi2i_r-w", "UCxhqqSd68pWYUj3DDbK1A1Q", "UC4YB00SwlJGG6wMZMwlGYXw",
    "UC5NQmkj8HjWWzVg8mhH3aEg", "UCpnvVBCVebsxj5ncdbiw6gQ", "UCY-weLvpiy4i9BGnFnRt_gw", "UCxAlDLZ6-6Kj4Zm9fYwyMmA",
    "UCEaHT_4Sphumk8v7yMFoaag", "UCFBS8pzFOB32DrZnsUzjaWg", "UC8h--vde1dlGDtgrnEFysnA", "UCnF3eG4BKczq2vdElmeZQbg",
    "UCTQMiYgCiArluapAsDHQgkQ", "UC0rpO0_bhgHb4krPwu_Mm4A", "UCtpC5Pmtmf5iDoYywIpbBmw", "UCtsIwWC2-yodywm24Yad6iA",
    "UCpocN29Ie81bqvuwCutMRFw", "UCPP1Jt0WKVaFdsfKoQ6V4CQ", "UCScLnl7CW28IPu0LFcJlFyw", "UCmqe9ggtKWsLzLIcgwl0QYA",
    "UCnV83XXXVsG3gvoDB1uv6xw", "UCnKGYGHXJ1NiYBodwsn1I4Q", "UCNl2iWYylmSffk-CQGH2xFA", "UCp903qFRI174Hgem3U-xUSw",
    "UCQx-U8eBnrWUbzW3sHc37qA", "UC8lnfM6K5h3kRF-x1IfrAXg", "UC09bft_mKzrw_9q70UqhEmg", "UC-p3q6-rTrsbXQvyLKtsmyA",
    "UC-RKRMoOHzDoeSABwETdlmA", "UC6s2ncSle5QnxePsokDwfZA", "UCbzzVZENBEpAQN2CLKRvABA", "UCAEeJOM88-VwwilSLO9_alQ",
    "UCaoHFlMvU991ZSCUj4MrdeQ", "UCvIcAHAHN8co6TxjEQ4cw8g", "UCZ4PiSVh_R8zq9WyHyCKrHQ", "UCy3ITFPKV1RkkXTcvw5wPrg",
    "UCXMeVCA6mN1eNlhzFfr03tw", "UCyecBV1o622OQDktJUJuVWQ", "UCfffWl6fubAS_yBomOHZI3w", "UCfTwyTOTp_EIrkog7EKEyPQ",
    "UCd-EbFN-bL-R4Mardi-cRQw", "UCDmEaYqc54HIKcQGhClLJVQ", "UCddyE5rmbL4Wfu669o1hPag", "UChtF5VVcFAqMDFDijHcnNpg",
    "UCjRAusVxY7zi4UTB0HIT7ng", "UCLqJAdaD3sl69ws2R4DhNig", "UCfptHH9wJ0ZwUOF0uJcZw2w", "UCicCmO0r9BG0JYD2V-O3dLg",
    "UCiisoRe6ZobZIqAfII5VY4Q", "UCjNxcxkpbWw6_F0c3mcNdpg", "UCAhpqtN-Gv1Zkyx-3CLUxAA", "UCYi8t3qNdu-Uievtmz3n_gw",
    "UCVT4hVYW_f-mDlgvVGMIIww", "UCWJ3Fgor4yYwqGL-34sgcAw", "UCz6knNhD-u4_tnnP3VMo24Q", "UCyP3w5tyHuegAYrUbfcHKDg",
    "UCyHFhp_YB33A6vmZ-pu4gTw", "UCXZyfIsoYEHlEVktDELQjyQ", "UCXLDmrvw8AA0pF17QfwivUQ", "UCugyanNed5LbEZ_RwfAdCwQ",
    "UCPTKEKNq-OIYdAEumXIYIvw", "UCqfWuhKosei1J5rzWlncNXw", "UCRYd6l1oDSywqvxckWRFIpw", "UCJQyntQPPGgbtBv27bHyfZQ",
    "UCyuv9qrmZDMRNq80cUobdzg", "UC7lMU6gQpRQpjzpYu2jh1PA", "UC5GrKrNJKdX_TtJaX0-mo0w", "UCCRD-PyVUtxSvuhJuNz7raQ",
    "UCL4qEqv5hd8ZFyDMNebQIdA", "UCjkOz0p-Sg_FPzvJXFfXXRw", "UCibamWG2EP_gziTUzbXcAqA", "UCIYp2o6YW1cMpVdUn68MKCw",
    "UChPqNyCmlp2jABlrk3FKsng", "UC8b3_wPqUnFfyvKFmsm_z9w", "UC1wO2MxoS7PR7oypZGVaS9w", "UC4jzfcuZqV7gpf3Uu7R7H_Q",
    "UC-TwmqyQO764za3b8G8Ozsg", "UCBdWKD0YGrqUCmseI6GL1VA", "UCrBGAWr24pPQn-HUWZDBelQ", "UCPrWoYShjSnfSxgkbOk-PiQ",
    "UCNW5ziRiMdzb6YM32VxnZKg", "UCypeTkEBY9rKAzQWpppBp-g", "UCwTbSIis1uz16EjQtCOKSbw", "UCVC-e4aStS6EySKeSR2ItYw",
    "UCypNCnxkKIy0xLgBW9Wwppg", "UCzNUqtSjC2RBni5ewW2S5bQ", "UCamZ6TTjSOCeDmcg5oD5NsQ", "UC0bd1IAfOijSGAZQYhpEypg",
    "UCIrstpCEYV8SOT2skpktDYw", "UCNUahyRoiz4VOoFmMiyRuVg", "UCO9h4DwGmtgo8YYdGIGV28A", "UCRv9IO6bCHktbdn5XoD632A",
    "UCRLea4cskrcuGP8uGUA-x_g", "UCuKNbSO-ZVoHZ4NIVFYy7ag", "UCUMSsn0zsNKYPS7LzmVVhRA", "UC87HSYnhZlfebP70o_U7l6A",
    "UCC9hM7sx7pnPWPoxbSJrVnQ", "UCjTwJHECSd-98yZJmnvJsng", "UCwLrgnH-T8ullUAaMwLdnYQ", "UC_X2HPji9wegfWF4J8H6kDg",
    "UC9kJ9v_IGA_oL42Zp2omXtQ", "UCRFcCzkWgS9BWK8XaopSq6Q", "UCzhFKXIrUtH9n9JPvScZoLQ", "UCxpbK6dZznAbQE_gAg_7zrg",
    "UCTxV3fxd7kgsRnLZ2n9jnvQ", "UCPVsgfRwCQbM2lH2i3NqUnQ", "UCm6_5_kXlBdPKzxRSk0m-rA", "UCR5fd-OGDB1zvImIHuCKSmg",
    "UCot5aqu6rlsx10XLMOIJxeg", "UC9m4PCLBYqIaJ1QG9vAHgtg", "UCcRGwIaBOA0FqJI8TYZvarA", "UCEiil7pdXFs4lsldgQ_7TTw",
    "UCe5d_RTseIOlhAEl0AeJ1jw", "UCjzJ5he4ojdnbvXKn-QDwJA", "UCK2jrlNysAJ3n6WV3srnlEA", "UCHYSG-USBEO7kdTt_uemSfg",
    "UCiAyBnHi4ZDKxMD4soo3Y2A", "UC7O2MfJaDVPUXA7Saej2nBg", "UC7odPvjigbp7Wa6Xb8KaLpw", "UC6Rwr5Bg7dhqiQohxghHWCg",
    "UCAgu5EJBK_HkeQE9KbnzqyA", "UCP2WnJptkXFSnj5bZs5gcHw", "UCogFJDg84nZvP3b2chzCxTQ", "UCMNTGS-ksw3G5HJ8rhOnuSA",
    "UCxKIHs5z1XYwRitd-tN1kNg", "UCZjpcxesRQx10NcJ4B9_PlQ", "UCvcxoH8riEawjY3uCcLMlpA", "UCaPOlsXfHOUw7cwMez8Rwmw",
    "UC9BWN4MypbxgcOe3FqshxPw", "UC0O1Y0Soj_uK-dsLeLqtGaA", "UCEPhson8hEHOgFjWWbIov5Q", "UCFG_rU_qX8LrLsRJSW2PvZg",
    "UCf3SymkDrQUpIF0Ylx8QVYA", "UCt9PnERH2HEKINFNhESSdfQ", "UCtzNcFoAMrkKNSs-M2I2CAQ", "UCtmLwPfmuUdrfHUMuvsRVRQ",
    "UCuOiuwMxH8s2fJ5bKvXzSuQ", "UCOIoyQU06BkhTXKGuwQTI4A", "UCYNyOX9syK5t9hxMXyl6S2A", "UC7UtlrfYwm0I4VB14-R_Jqw",
    "UCfKQV8VnATIlZEQPBv5mxvw", "UCk3KWdJ5JNHxehHyokEer9g", "UCdZ4-8mNtqmDuQj1Yi8fJOA", "UC2XnjOQtAvhFlS4yJL1WAPg",
    "UC-o-1qjKkMLq-ZFxXIzOUBQ", "UC5ALyEjmW5vpX2qk0NAdR9w", "UCWuUKALtjIqzIHO3kiVdh2A", "UCuOv9mEFr7rNvR3QVGUspSQ",
    "UCRgfanvsQ9iy7Gtogm8Kovw", "UCRIS5kNLBquano6DE1elnSw", "UCrpsdF7UreiF-2r5Jp0YpRg", "UCrrc6lZSpx-Fzq0gZAhlczw",
    "UCqi9ia8w-fqT3JJjIQTmu4A", "UCI2hA8WukW-Q90aabtm3Hbw", "UCjwLv-fDSUEpiP438HVOc4g", "UCepnU95mTMWUJEgH4-I2_SQ",
    "UCGLcmUt6Y7YEWdiehVg9QBg", "UCGO6h4dRqsuAey9PDs3cAxw", "UCO_QTpBovn5HYC8SRPfesXA", "UCRtDA2y_ZVhnqpdHhXqgRdQ",
    "UCR442Sovb-d-hLGkdfxaktw", "UCTg46YLTOMszRkRrCh6EJaA", "UC3cPGhxXvkYCTsY8zcmAZIw", "UC_ohJQt4pKsXbWeXVN7lMaQ",
    "UCGvoDqN7gq_yX8dXeLXJ1Yg", "UCPxH_2gUYHYuneJJQbiGqkA", "UCA9xy-bfppaNh298oqLsDyg", "UCSkc5tjkdkf_rkLwJYBNrbg",
    "UCtWmMr82kjISVwOW5Pv3Yrg", "UCg5SYUOaLgg78_kiY5rxpgw", "UCvPzkF6H3UJrW0kuEc7bwsA", "UC1L1BrXLusMezADMQ2oml9Q",
    "UClGg7eLuIvxbbVFGH61q5uQ", "UCiLjFDdif8vPHMW_qiHHPmA", "UCtUGiLtNTVMcL4-JTgw1gow", "UCmu0N5sTVnkqaBG_XLWpsYQ",
    "UCpl21qIZZOIUu6-2qw1338g", "UCP3BNqnXzQXVr_TAa-NvDPA", "UCpD4xzrZ2hYq1x5wCCTZ0Dg", "UCX0GXISQMEH_I8zXWMp9KsQ",
    "UCx8X2_uJgUiv88CXk6KRFiw", "UCDiHlRcUxUHdEOfSWgFsEmA", "UCCVFBRYR0TopeBRs809ki2Q", "UC3CqkDjfQr5PCBIxV-himXA",
    "UCQBUJeNvw4jG_cSNHMPwFzQ", "UCo3mZ1mwgaTzCZXgnpuTEPw", "UCQx8svSKp6OIrNUv0Eqk3EQ", "UCzx_CKyz4u2eXd12Xule5yw",
    "UCxHCHOzGr3s1zjxa8tyyW5g", "UCG6gNzudoKbgXTfCrQC2opA", "UCCd_t6l5vtKirROFAMXllig", "UC_r0fvn23IFid0grmlBxWDA",
    "UCCIJeBUuQiZH5IUj-f47JQA", "UCyNcRcOm0HH3zAo5W2o2eRg", "UCoH241jLlMc2Ew0hPMp_P7A", "UCmd0nAr5eAYyNcuhIhmHCyQ",
    "UCupUwguzSmt1j2MzbfWXzdQ", "UCDQZaBfu9cWIlAjkWI6zf1Q", "UCqrwuLR-o-8BEC9ZyMx6eaA", "UCMbqWp-GL_W252qQDV_MyGw",
    "UCP9VmwDD9aOeD9gHmPXk4lg", "UCu7yc85otP3n9HMfmtQlTUA", "UCNo6DvCkfUD96QAlsgrpGMg", "UCVAzodYFGxd8xYEEClk4Qqw",
    "UC1AIOs9c2w6CyF2eOzCaw7w", "UCg0UuMdRQXaVEhBldMQo7LQ", "UCiRn7JcCUGmJ2Q3kRFhQo8g", "UCg4IP8-F5rwCnGYcBrHxeAA",
    "UCd5HrVIF_jF6mHxAjQIE3Wg", "UCs-EfdOTVzMV8niphqbDjxg", "UCTmZF0sjPEX5RLNiAzhZrCQ", "UC9Ew_-ZA0AXy3YYWHuIsfAw",
    "UCBIR-MiqDcrxKYdw9Gy5v2A", "UC-wWB_7n6de9z0FyGBOW4WA", "UC_WK_oay6OBbXWnmzSyk9vQ", "UC_ZXYFW_f9iD2ScjTUY_Prw",
    "UC7EVK8SZeM30ofdB2_M3iLQ", "UCxQ_OnYNkMMMBLT-P9Jo89A", "UCZ5kzE0vQ-opUU9HPmiJBlg", "UC4OuA2PAVbmLY1N9v3ErSBA"
];

// --- HELPERS (Copied from scrape_website.js) ---
const isValidEmail = (text) => {
    if (!text) return null;
    const matches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g);
    if (!matches) return null;

    const fileExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.doc', '.docx', '.zip', '.rar', '.mp3', '.mp4', '.avi', '.mov', '.exe', '.dll', '.iso', '.dmg', '.apk'];

    return matches.find(e => {
        const lowerEmail = e.toLowerCase();
        return !lowerEmail.includes('example') &&
            !lowerEmail.includes('sentry') &&
            !lowerEmail.includes('wix') &&
            !lowerEmail.includes('noreply') &&
            !lowerEmail.includes('no-reply') &&
            !fileExtensions.some(ext => lowerEmail.includes(ext));
    }) || null;
};

const isValidWebsite = (url) => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname || '';
        const excludedDomains = [
            'youtube.com', 'youtu.be', 'facebook.com', 'twitter.com', 'x.com',
            'instagram.com', 'tiktok.com', 'discord.gg', 'twitch.tv', 'reddit.com',
            'linkedin.com', 'pinterest.com', 'google.com', 'bit.ly', 'tinyurl.com'
        ];
        return !excludedDomains.some(excluded => domain.includes(excluded));
    } catch {
        return false;
    }
};

const extractWebsites = async (page) => {
    try {
        // Try to find links in the 'Links' section of About page or Home page header
        const links = await page.locator('#links-section a, a[href*="http"]').all();
        const websites = new Set();

        for (const link of links) {
            try {
                let href = await link.getAttribute('href').catch(() => '');
                if (!href) continue;

                // Handle YouTube redirect URLs
                try {
                    const url = new URL(href);
                    if (url.hostname === 'www.youtube.com' && url.pathname === '/redirect') {
                        href = url.searchParams.get('q');
                    }
                } catch (e) { }

                if (!href) continue;

                if (isValidWebsite(href)) {
                    websites.add(href);
                }
            } catch (e) { }
        }
        return Array.from(websites);
    } catch (e) {
        return [];
    }
};

const scrapeWebsiteForEmail = async (browser, websiteUrl) => {
    let page;
    try {
        page = await browser.newPage();
        try {
            await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log(`      Website timeout/error: ${e.message}`);
            return { email: null, foundVia: null, website: websiteUrl };
        }
        await page.waitForTimeout(2500);

        // METHOD 1: Main page
        try {
            const bodyText = await page.innerText('body').catch(() => '');
            let email = isValidEmail(bodyText);
            if (email) return { email, foundVia: "website_main", website: websiteUrl };
        } catch (e) { }

        // METHOD 2: Contact pages
        try {
            const contactSelectors = ['a[href*="contact"]', 'a[href*="about"]', 'a:has-text("Contact")'];
            for (const selector of contactSelectors) {
                try {
                    const links = await page.locator(selector).all();
                    for (let i = 0; i < Math.min(links.length, 1); i++) {
                        let href = await links[i].getAttribute('href').catch(() => null);
                        if (!href) continue;

                        let fullUrl = href;
                        if (href.startsWith('/')) {
                            fullUrl = new URL(websiteUrl).origin + href;
                        }

                        // Just check first contact page found
                        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => { });
                        const contactText = await page.innerText('body').catch(() => '');
                        const email = isValidEmail(contactText);
                        if (email) return { email, foundVia: "website_contact", website: websiteUrl };
                    }
                } catch (e) { }
            }
        } catch (e) { }

        // METHOD 3: Mailto
        try {
            const mailto = await page.getAttribute('a[href^="mailto:"]', 'href').catch(() => null);
            if (mailto) {
                const email = isValidEmail(mailto);
                if (email) return { email, foundVia: "website_mailto", website: websiteUrl };
            }
        } catch (e) { }

        return { email: null, foundVia: null, website: websiteUrl };

    } catch (error) {
        return { email: null, foundVia: null, website: websiteUrl, error: error.message };
    } finally {
        if (page) await page.close().catch(() => { });
    }
};

// --- MAIN SCRAPER ---
(async () => {
    console.log(`🚀 Starting Hardcoded Test Scraper for ${CHANNEL_IDS.length} channels...`);

    const browser = await chromium.launch({
        headless: true,
        slowMo: 50,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    let foundCount = 0;

    for (let i = 0; i < CHANNEL_IDS.length; i++) {
        const channelId = CHANNEL_IDS[i];
        console.log(`\n[${i + 1}/${CHANNEL_IDS.length}] Processing Channel ID: ${channelId}`);

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            locale: 'en-US',
            extraHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });
        const page = await context.newPage();
        let foundEmail = null;
        let source = null;
        let foundWebsite = null;

        try {
            // 1. Visit YouTube Channel Page
            const youtubeUrl = `https://www.youtube.com/channel/${channelId}/about`;
            await page.goto(youtubeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

            // DEBUG: Log title to see if we are blocked/redirected
            const pageTitle = await page.title();
            // console.log(`   📄 Page Title: ${pageTitle}`);

            // CONSENT POPUP HANDLING
            try {
                const consentButton = page.locator('button[aria-label="Accept all"], button:has-text("Accept all"), button:has-text("Reject all")').first();
                if (await consentButton.isVisible()) {
                    console.log(`   🍪 Consent popup detected. Clicking...`);
                    await consentButton.click();
                    await page.waitForTimeout(2000);
                }
            } catch (e) { }

            await page.waitForTimeout(2000); // Wait for dynamic content

            // Check for email on YouTube page
            const pageContent = await page.content();
            const emailMatch = pageContent.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
                foundEmail = isValidEmail(emailMatch[0]);
                if (foundEmail) {
                    source = 'youtube_page';
                    console.log(`   ✅ Email found on YouTube: ${foundEmail}`);
                }
            }

            // 2. Extract Website (if no email found yet)
            if (!foundEmail) {
                const websites = await extractWebsites(page);
                if (websites.length > 0) {
                    foundWebsite = websites[0]; // Take first valid website
                    console.log(`   🌐 Found website: ${foundWebsite}`); // Log website here

                    const result = await scrapeWebsiteForEmail(browser, foundWebsite);
                    if (result.email) {
                        foundEmail = result.email;
                        source = result.foundVia;
                        console.log(`   ✅ Email found on Website (${result.foundVia}): ${foundEmail}`);
                    } else {
                        console.log(`   ❌ No email found on website.`);
                    }
                } else {
                    console.log(`   ❌ No website found on YouTube channel.`);
                    // DEBUG: Log a bit of body text to see what was actually loaded
                    // const bodyText = await page.innerText('body');
                    // console.log(`   🕵️‍♂️ Page Body Preview: ${bodyText.substring(0, 100).replace(/\n/g, ' ')}...`);
                }
            }

            if (foundEmail) foundCount++;

        } catch (e) {
            console.error(`   ❌ Error processing channel: ${e.message}`);
        } finally {
            await context.close();
        }
    }

    await browser.close();
    console.log(`\n🎉 Test Complete. Found emails for ${foundCount}/${CHANNEL_IDS.length} channels.`);
})();
