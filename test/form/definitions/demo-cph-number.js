import {
  ComponentType,
  ConditionType,
  ControllerPath,
  ControllerType,
  Coordinator,
  DateDirections,
  DateUnits,
  OperatorName
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Apply for a county parish holding (CPH) number',
  startPage: '/are-you-18-or-older',
  pages: [
    {
      title: "What's the name of  the applicant?",
      path: '/whats-the-name-of-the-applicant',
      next: [
        {
          path: '/business-name'
        }
      ],
      components: [
        {
          name: 'Jhimsh',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">Enter the name of the person applying for the county parish holding (CPH) number. This should be the person who is responsible for the livestock.</p>\n',
          options: {}
        },
        {
          name: 'TKsWbP',
          title: 'Title',
          type: ComponentType.TextField,
          hint: '',
          options: {
            classes: 'govuk-!-width-one-quarter',
            required: false
          },
          schema: {}
        },
        {
          name: 'iyutEh',
          title: 'First name',
          type: ComponentType.TextField,
          options: {
            classes: 'govuk-input govuk-!-width-one-half'
          },
          schema: {}
        },
        {
          name: 'ByUqQW',
          title: 'Middle name',
          type: ComponentType.TextField,
          hint: '',
          options: {
            required: false,
            classes: 'govuk-input govuk-!-width-one-half'
          },
          schema: {}
        },
        {
          name: 'GDYfTS',
          title: 'Last name',
          type: ComponentType.TextField,
          options: {
            classes: 'govuk-input govuk-!-width-one-half'
          },
          schema: {}
        }
      ]
    },
    {
      path: '/whats-your-home-address',
      title: "What's your home address?",
      components: [
        {
          name: 'hpmkrN',
          title: 'Home address',
          type: ComponentType.UkAddressField,
          options: {
            hideTitle: true
          }
        }
      ],
      next: [
        {
          path: '/do-you-want-to-add-a-second-contact'
        }
      ]
    },
    {
      path: '/telephone-numbers',
      title: 'Telephone numbers',
      components: [
        {
          name: 'ndonzl',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nThe Rural Payments Agency (RPA) will use the phone numbers you provide to contact you if they need to discuss your application.\n</p>',
          options: {}
        },
        {
          name: 'aEFhyW',
          title: "What's your main phone number?",
          type: ComponentType.TelephoneNumberField,
          hint: '',
          options: {}
        },
        {
          name: 'tmSOkR',
          title: "What's your second phone number?",
          type: ComponentType.TelephoneNumberField,
          options: {
            required: false
          }
        }
      ],
      next: [
        {
          path: '/whats-your-email-address'
        }
      ]
    },
    {
      path: '/whats-your-email-address',
      title: "What's your email address?",
      components: [
        {
          name: 'uZcVcc',
          title: 'Email address',
          type: ComponentType.EmailAddressField,
          hint: 'The Rural Payments Agency (RPA)  will email your CPH number to you.',
          options: {}
        }
      ],
      next: [
        {
          path: '/whats-your-business-address'
        },
        {
          path: '/whats-your-home-address',
          condition: 'jJEMOD'
        }
      ]
    },
    {
      path: '/business-name',
      title: 'Business name',
      components: [
        {
          name: 'azvqQo',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">RPA needs to register you as a business on their system (the Rural Payments service) before they can give you a CPH number. They must do this even if you keep livestock as pets or for a hobby.\n</p>\n\n\n\n\n',
          options: {}
        },
        {
          name: 'jFlrpY',
          title: 'What is the name of the business?',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        }
      ],
      next: [
        {
          path: '/telephone-numbers'
        }
      ]
    },
    {
      path: '/legal-status-of-your-business',
      title: 'Legal status of your business',
      components: [
        {
          name: 'KVSTXs',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nThe Rural Payments Agency (RPA) needs the legal status of your business to register you on the Rural Payments service.\n<br><br>\nRead more about <a href="https://www.gov.uk/set-up-business"class=" govuk-link" target="_blank">registering a business (opens in new tab)</a> or <a href="https://www.gov.uk/guidance/charity-types-how-to-choose-a-structure" class="govuk-link" target="_blank">find out more about charity types (opens in new tab)</a>. If you\'re not sure, seek professional advice.\n</p>',
          options: {}
        },
        {
          name: 'yHQAol',
          title: 'Business legal status',
          type: ComponentType.RadiosField,
          list: 'LLfsSM',
          options: {}
        }
      ],
      next: [
        {
          path: '/charity-number',
          condition: 'HhHvCo'
        },
        {
          path: '/what-is-the-main-purpose-of-your-business',
          condition: 'Mofdix'
        },
        {
          path: '/companies-house',
          condition: 'WWZpek'
        },
        {
          path: '/legal-status-of-your-business-something-else',
          condition: 'NqsUxW'
        }
      ]
    },
    {
      path: '/companies-house',
      title: 'Companies House',
      components: [
        {
          name: 'vvVXGQ',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nThe Rural Payments Agency (RPA) need to know your company number. You can get this from Companies House.\n<br><br>\n<a href="https://find-and-update.company-information.service.gov.uk/"class=" govuk-link" target="_blank">Find your company number (opens in new tab)</a>\n<br><br>\nYou can also find your company number on any documents you have received from Companies House.\n</p>',
          options: {}
        },
        {
          name: 'nNNsgO',
          options: {
            customValidationMessage: 'Enter a valid company number'
          },
          type: ComponentType.TextField,
          title: "What's your company number?",
          hint: 'You company number is either an 8-digit number or 2 letters followed by a 6-digit number, for example, 03256178 or SL123456.',
          schema: {
            regex: '^([0-9]{8}|(LP|NC|NL|NI|OC|SC|SL|SO)[0-9]{6}|R[0-9]{7})$'
          }
        }
      ],
      next: [
        {
          path: '/what-is-the-main-purpose-of-your-business'
        }
      ]
    },
    {
      path: '/charity-number',
      title: 'Charity number',
      components: [
        {
          name: 'uHmVat',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\n<a href="https://register-of-charities.charitycommission.gov.uk/charity-search" class="govuk-link" class="govuk-link" target="_blank">Search the register of charities (opens in new tab)</a> to find your charity number.\n</p>',
          options: {}
        },
        {
          name: 'ifygYY',
          title: "What's your charity number?",
          type: ComponentType.NumberField,
          hint: '',
          schema: {},
          options: {}
        }
      ],
      next: [
        {
          path: '/what-is-the-main-purpose-of-your-business'
        }
      ]
    },
    {
      path: '/what-is-the-main-purpose-of-your-business',
      title: 'What is the main purpose of your business?',
      components: [
        {
          name: 'AoofuF',
          type: ComponentType.RadiosField,
          list: 'kMOALL',
          title: 'Business type',
          hint: "Select the main purpose of your business. If you're a farmer and you keep livestock, select 'farmer'.",
          options: {}
        }
      ],
      next: [
        {
          path: '/is-your-business-a-market-showground-or-zoo'
        },
        {
          path: '/what-is-the-main-purpose-of-your-business-something-else',
          condition: 'mLnJPE'
        }
      ]
    },
    {
      path: '/what-type-of-business-do-you-have',
      title: 'What type of business do you have?',
      components: [
        {
          name: 'hCxIFa',
          type: ComponentType.TextField,
          title: 'What type of business do you have?',
          options: {},
          schema: {}
        }
      ],
      next: [
        {
          path: '/is-your-business-a-market-showground-or-zoo'
        }
      ]
    },
    {
      path: '/what-livestock-will-you-keep',
      title: 'What livestock will you keep?',
      components: [
        {
          name: 'vumpmr',
          options: {},
          type: ComponentType.CheckboxesField,
          list: 'CoRNqi',
          title: 'Livestock that you keep'
        }
      ],
      next: [
        {
          path: '/what-do-you-use-animal-by-products-for',
          condition: 'KzDEBv'
        },
        {
          path: '/you-must-use-a-different-service',
          condition: 'dfoUtU'
        },
        {
          path: '/business-or-hobbyist'
        }
      ]
    },
    {
      path: '/what-do-you-use-animal-by-products-for',
      title: 'What do you use animal by-products for?',
      components: [
        {
          name: 'nTEdlT',
          type: ComponentType.TextField,
          title: 'What you use animal by-products for',
          hint: 'For example, using animal by-products to produce pet food',
          options: {},
          schema: {}
        }
      ],
      next: [
        {
          path: '/business-or-hobbyist'
        }
      ]
    },
    {
      path: '/is-your-business-a-market-showground-or-zoo',
      title: 'Is your business a market, showground or zoo?',
      components: [
        {
          name: 'jLxphO',
          title: 'Is your business a market, showground or zoo?',
          type: ComponentType.RadiosField,
          hint: 'Your answer will help us to process your application correctly',
          list: 'rieXPV',
          options: {}
        }
      ],
      next: [
        {
          path: '/does-your-business-have-a-second-contact',
          condition: 'oKXMlf'
        },
        {
          path: '/national-grid-field-number-for-where-youll-keep-livestock'
        }
      ]
    },
    {
      path: '/arrival-date',
      title: 'Arrival date',
      components: [
        {
          name: 'NRlngf',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nTell the Rural Payments Agency (RPA) when the livestock or animal by-products will arrive. This date must be no more than 6 weeks from today\'s date. If they will arrive later, do not apply for your CPH number now.\n<br><br>\nIf you do not know when the livestock or animal by-products will arrive, give an estimate. If they have already arrived, you can put a date in the past.\n<br><br>\nRPA need to know this so they can prioritise your application.\n</p>',
          options: {}
        },
        {
          name: 'uogTBM',
          title: 'What date will the livestock or animal by-products arrive?',
          type: ComponentType.DatePartsField,
          hint: 'If you keep both livestock and animal by-products, tell us the date the first one will arrive.',
          options: {}
        }
      ],
      next: [
        {
          path: '/what-livestock-will-you-keep'
        },
        {
          path: '/the-livestock-must-arrive-within-6-weeks',
          condition: 'oQKstF'
        }
      ]
    },
    {
      path: '/will-you-keep-livestock-or-use-animal-by-products-at-your-home-address',
      title:
        'Will you keep livestock or use animal by-products at your home address?',
      components: [
        {
          name: 'QcfaVC',
          title:
            'Will you keep livestock or use animal by-products at your home address?',
          type: ComponentType.YesNoField,
          options: {}
        }
      ],
      next: [
        {
          path: '/whats-the-address-where-youll-keep-livestock-or-use-animal-by-products',
          condition: 'jxSqwt'
        },
        {
          path: '/national-grid-field-number-for-where-youll-keep-livestock'
        }
      ]
    },
    {
      path: '/national-grid-field-number-for-where-youll-keep-livestock',
      title: "National Grid field number for where you'll keep livestock",
      components: [
        {
          name: 'GIGZXr',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nRPA need the National Grid field number for the main area where you\'ll keep livestock. For example, if you\'re a:\n</p>',
          options: {}
        },
        {
          name: 'hJJvRZ',
          title: "National Grid field number for where you'll keep livestock",
          type: ComponentType.List,
          list: 'OxfbRE',
          options: {
            hideTitle: true
          }
        },
        {
          name: 'moXMAe',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nIf your business uses animal by-products, this will be for the premises where you use them.\n<br><br>\nUse the <a href="https://magic.defra.gov.uk/" class="govuk-link" target="_blank">MAGIC map (opens in new tab)</a> to find the National Grid field numbers for your land or buildings. Follow these instructions:\n\n<ol class="govuk-list govuk-list--number">\n<li>Select ‘Get Started’.</li>\n<li>Search for a postcode or place.<br></li>\n<li>Using the map, locate the land or building. Use the +/- icons to zoom in and out.<br></li>\n<li>In the top toolbar, select the fourth icon along (\'Where am I?\') - it looks like a target.</li>\n<li>Click on the land or building.<br></li>\n<li>A pop-up box will appear showing the land details for this location. The National Grid field number is the fourth number down and comes after the ‘Grid Ref’ (Ordnance Survey grid reference). It’s made up of 2 letters and 8 numbers, for example, SO 0418 8589.</li>\n</ul>\n</p>',
          options: {}
        },
        {
          name: 'sLRVWq',
          type: ComponentType.TextField,
          title:
            "What's the National Grid field number for the main area where you'll keep livestock or use animal by-products?",
          options: {
            customValidationMessage: 'Enter a valid National Grid field number',
            classes: 'govuk-!-width-one-third'
          },
          schema: {
            regex:
              '^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\\s?([0-9]{4})\\s?([0-9]{4})$'
          }
        }
      ],
      next: [
        {
          path: '/will-you-keep-livestock-or-use-animal-by-products-anywhere-else'
        }
      ]
    },
    {
      path: '/will-you-keep-livestock-or-use-animal-by-products-anywhere-else',
      title: 'Will you keep livestock or use animal by-products anywhere else?',
      components: [
        {
          name: 'MBoevI',
          title:
            'Will you keep livestock or use animal by-products anywhere else?',
          type: ComponentType.YesNoField,
          hint: "The Rural Payments Agency (RPA) needs to know about any other land or buildings you'll use to keep livestock",
          options: {}
        }
      ],
      next: [
        {
          path: '/national-grid-field-numbers-for-other-land-and-buildings-where-youll-keep-livestock'
        },
        {
          path: '/do-you-own-the-land',
          condition: 'qLowJn'
        }
      ]
    },
    {
      path: '/national-grid-field-numbers-for-other-land-and-buildings-where-youll-keep-livestock',
      title:
        "National Grid field numbers for other land and buildings where you'll keep livestock",
      components: [
        {
          name: 'ILcbVH',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nTell us where you\'ll keep animals, in addition to the main area.\n<br><br>\nUse the <a href="https://magic.defra.gov.uk/" class="govuk-link" target="_blank">MAGIC map (opens in new tab)</a> to find the National Grid field numbers for your land or buildings. Follow these instructions:\n\n<ol class="govuk-list govuk-list--number">\n<li>Select ‘Get Started’.</li>\n<li>Search for a postcode or place.<br></li>\n<li>Using the map, locate the land or building. Use the +/- icons to zoom in and out.<br></li>\n<li>In the top toolbar, select the fourth icon along (\'Where am I?\') - it looks like a target.</li>\n<li>Click on the land or building.<br></li>\n<li>A pop-up box will appear showing the land details for this location. The National Grid field number is the fourth number down and comes after the ‘Grid Ref’ (Ordnance Survey grid reference). It’s made up of 2 letters and 8 numbers, for example, SO 0418 8589.</li>\n</ul>\n</p>',
          options: {}
        },
        {
          name: 'wBfSTW',
          title: 'National Grid field number for additional field 2',
          type: ComponentType.TextField,
          options: {
            required: true,
            classes: 'govuk-!-width-one-third',
            customValidationMessage: ''
          },
          schema: {
            regex:
              '^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\\s?([0-9]{4})\\s?([0-9]{4})$'
          }
        },
        {
          name: 'mLvSOS',
          title: 'National Grid field number for additional field 3',
          type: ComponentType.TextField,
          options: {
            required: false,
            optionalText: false,
            classes: 'govuk-!-width-one-third',
            customValidationMessage: ''
          },
          schema: {
            regex:
              '^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\\s?([0-9]{4})\\s?([0-9]{4})$'
          }
        },
        {
          name: 'VqlUVC',
          title: 'National Grid field number for additional field 4',
          type: ComponentType.TextField,
          options: {
            required: false,
            classes: 'govuk-!-width-one-third',
            customValidationMessage: ''
          },
          schema: {
            regex:
              '^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\\s?([0-9]{4})\\s?([0-9]{4})$'
          }
        },
        {
          name: 'ueciBB',
          title: 'National Grid field number for additional field 5',
          type: ComponentType.TextField,
          options: {
            required: false,
            classes: 'govuk-!-width-one-third',
            customValidationMessage:
              'Enter a valid National Grid field number for additional field 5'
          },
          schema: {
            regex:
              '^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\\s?([0-9]{4})\\s?([0-9]{4})$'
          }
        },
        {
          name: 'QAHEJC',
          title: 'National Grid field number for additional field 6',
          type: ComponentType.TextField,
          options: {
            required: false,
            classes: 'govuk-!-width-one-third',
            customValidationMessage:
              'Enter a valid National Grid field number for additional field 6'
          },
          schema: {
            regex:
              '^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\\s?([0-9]{4})\\s?([0-9]{4})$'
          }
        },
        {
          name: 'BxsQdG',
          title: 'National Grid field number for additional field 7',
          type: ComponentType.TextField,
          options: {
            required: false,
            classes: 'govuk-!-width-one-third',
            customValidationMessage:
              'Enter a valid National Grid field number for additional field 7'
          },
          schema: {
            regex:
              '^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\\s?([0-9]{4})\\s?([0-9]{4})$'
          }
        },
        {
          name: 'OAlihM',
          title: 'National Grid field number for additional field 8',
          type: ComponentType.TextField,
          options: {
            required: false,
            autocomplete: '',
            classes: 'govuk-!-width-one-third',
            customValidationMessage:
              'Enter a valid National Grid field number for additional field 8'
          },
          schema: {
            regex:
              '^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\\s?([0-9]{4})\\s?([0-9]{4})$'
          }
        },
        {
          name: 'UlWuJy',
          title: 'National Grid field number for additional field 9',
          type: ComponentType.TextField,
          options: {
            required: false,
            classes: 'govuk-!-width-one-third',
            optionalText: false,
            customValidationMessage:
              'Enter a valid National Grid field number for additional field 9'
          },
          schema: {
            regex:
              '^((([sS]|[nN])[a-hA-Hj-zJ-Z])|(([tT]|[oO])[abfglmqrvwABFGLMQRVW])|([hH][l-zL-Z])|([jJ][lmqrvwLMQRVW]))\\s?([0-9]{4})\\s?([0-9]{4})$'
          }
        }
      ],
      next: [
        {
          path: '/do-you-own-the-land'
        }
      ]
    },
    {
      path: '/do-you-own-the-land',
      title: 'Do you own the land?',
      components: [
        {
          name: 'rOgnUv',
          title: 'Do you own the land?',
          type: ComponentType.YesNoField,
          hint: "If you rent the land, select 'No'",
          options: {}
        }
      ],
      next: [
        {
          path: '/do-you-want-to-tell-us-anything-else',
          condition: 'VtzzTR'
        },
        {
          path: '/is-your-tenancy-agreement-for-more-than-one-year',
          condition: 'yTTblu'
        }
      ]
    },
    {
      title: 'Do you want to tell us anything else?',
      path: '/do-you-want-to-tell-us-anything-else',
      next: [
        {
          path: '/what-do-you-want-to-tell-us',
          condition: 'MrMPHC'
        },
        {
          path: '/rural-payments'
        }
      ],
      components: [
        {
          name: 'ledUEN',
          title: 'Anything else to tell us',
          type: ComponentType.YesNoField,
          hint: '',
          options: {
            required: false
          }
        }
      ]
    },
    {
      title: 'Rural payments',
      path: '/rural-payments',
      next: [
        {
          path: '/summary'
        }
      ],
      components: [
        {
          name: 'dOMSCK',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nFind out about the available <a href="https://www.gov.uk/guidance/funding-for-farmers" class="govuk-link" target="_blank">funding for farmers, growers and land managers (opens in new tab)</a>\n<br><br>\nAnswering \'No\' does not stop you from applying for funding at a later date.\n</p>',
          options: {}
        },
        {
          name: 'qIhSXZ',
          title: 'Do you intend to claim funding from the RPA?',
          type: ComponentType.YesNoField,
          hint: "Select 'No' if you're not sure",
          options: {}
        }
      ]
    },
    {
      path: ControllerPath.Summary,
      controller: ControllerType.Summary,
      title: 'Check your answers before submitting your form'
    },
    {
      path: '/whats-your-business-address',
      title: "What's your business address?",
      components: [
        {
          name: 'SJmeaZ',
          title: 'Business address',
          type: ComponentType.UkAddressField,
          hint: 'Your business address must be a postal address',
          options: {}
        }
      ],
      next: [
        {
          path: '/legal-status-of-your-business'
        }
      ]
    },
    {
      path: '/whats-the-address-where-youll-keep-livestock-or-use-animal-by-products',
      title:
        "What's the address where you'll keep livestock or use animal by-products?",
      components: [
        {
          name: 'sDJyOK',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nThis will help trace the animals to prevent and contain disease.\n</p>',
          options: {}
        },
        {
          name: 'PXRMtw',
          title: 'Address for livestock and animal by-products',
          type: ComponentType.UkAddressField,
          options: {
            hideTitle: true
          }
        }
      ],
      next: [
        {
          path: '/national-grid-field-number-for-where-youll-keep-livestock'
        }
      ]
    },
    {
      path: '/is-your-tenancy-agreement-for-more-than-one-year',
      title: 'Is your tenancy agreement for more than one year?',
      components: [
        {
          name: 'qLmGSL',
          title: 'Is your tenancy agreement for more than one year?',
          type: ComponentType.YesNoField,
          options: {}
        }
      ],
      next: [
        {
          path: '/does-the-landowner-have-a-cph-number-for-the-land',
          condition: 'jHDHJK'
        },
        {
          path: '/do-you-want-to-tell-us-anything-else',
          condition: 'WgVJGi'
        }
      ]
    },
    {
      path: '/does-the-landowner-have-a-cph-number-for-the-land',
      title: 'Does the landowner have a CPH number for the land?',
      components: [
        {
          name: 'uuQMUp',
          title: 'Does the landowner have a CPH number for the land?',
          type: ComponentType.YesNoField,
          options: {}
        }
      ],
      next: [
        {
          path: '/do-you-want-to-tell-us-anything-else'
        }
      ]
    },
    {
      title: 'Business or hobbyist',
      path: '/business-or-hobbyist',
      next: [
        {
          path: '/whats-your-name',
          condition: 'SmRHwO'
        },
        {
          path: '/whats-the-name-of-the-applicant'
        }
      ],
      components: [
        {
          name: 'UQlrDN',
          title: 'Html',
          type: ComponentType.Html,
          content:
            "<p class=\"govuk-body\">\nWhen you apply for a country parish holding (CPH) number, the Rural Payments Agency (RPA) will give you a single business identifier (SBI) number. You'll get an SBI number even if you're not a business.\n<br><br>\nIf you're a hobbyist keeper, RPA will use your full name as your business name.\n</p>",
          options: {}
        },
        {
          name: 'FsSpLA',
          title: 'Are you a hobbyist keeper or a business?',
          type: ComponentType.RadiosField,
          hint: '',
          list: 'IGZhBB',
          options: {}
        }
      ]
    },
    {
      title: "What's your name?",
      path: '/whats-your-name',
      next: [
        {
          path: '/telephone-numbers'
        }
      ],
      components: [
        {
          name: 'QvSFQU',
          title: 'Title',
          type: ComponentType.TextField,
          hint: '',
          options: {
            classes: 'govuk-!-width-one-quarter',
            required: false
          },
          schema: {}
        },
        {
          name: 'fGBFPv',
          title: 'First name',
          type: ComponentType.TextField,
          hint: '',
          options: {
            classes: 'govuk-input govuk-!-width-one-half'
          },
          schema: {}
        },
        {
          name: 'BzFtpG',
          title: 'Middle name',
          type: ComponentType.TextField,
          hint: '',
          options: {
            required: false,
            classes: 'govuk-input govuk-!-width-one-half'
          },
          schema: {}
        },
        {
          name: 'HEHgbQ',
          title: 'Last name',
          type: ComponentType.TextField,
          hint: '',
          options: {
            classes: 'govuk-input govuk-!-width-one-half'
          },
          schema: {}
        }
      ]
    },
    {
      title: 'What country will you keep livestock in?',
      path: '/what-country-will-you-keep-livestock-in',
      next: [
        {
          path: '/arrival-date'
        },
        {
          path: '/you-cannot-use-this-service',
          condition: 'WHxsFL'
        }
      ],
      components: [
        {
          name: 'aYjRCZ',
          title: 'Country where you will keep livestock',
          type: ComponentType.RadiosField,
          hint: '',
          list: 'oNaqxb',
          options: {}
        }
      ]
    },
    {
      title: 'You cannot use this service',
      path: '/you-cannot-use-this-service',
      next: [],
      components: [
        {
          name: 'INnXyT',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nYou cannot use this service to apply for a county parish holding (CPH) number if you live in Northern Ireland, Scotland or Wales.\n<br><br>\nRead guidance for:\n<ol class="govuk-list govuk-list--bullet"> \n<li><a href="https://www.daera-ni.gov.uk/topics/animal-health-and-welfare/identification-registration-and-movement" class="govuk-link" target="_blank">Northern Ireland</a> (opens in new tab)</li> \n<li><a href="https://www.ruralpayments.org/publicsite/futures/topics/customer-services/contact/" class="govuk-link" target="_blank">Scotland</a> (opens in new tab)</li> \n<li><a href="https://gov.wales/get-county-parish-holding-cph-number" class="govuk-link" target="_blank">Wales</a> (opens in new tab)</li> \n</ul> \n</p>',
          options: {}
        }
      ]
    },
    {
      title: 'You must use a different service',
      path: '/you-must-use-a-different-service',
      next: [],
      components: [
        {
          name: 'NxLvxq',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<h3 class="govuk-heading-m">Less than 50 poultry or other captive birds</h3>\n<p class="govuk-body">\nIf you’re a keeper of less than 50 poultry or other captive birds, you must <a href="https://www.gov.uk/guidance/register-as-a-keeper-of-less-than-50-poultry-or-other-captive-birds"class=" govuk-link" target="_blank">register with the Animal and Plant Health Agency (APHA) (opens in new tab)</a>. This includes any birds you keep as pets. APHA will provide you with a CPH number when you register. You should not apply for a country parish holding (CPH) number from the Rurual Payments Agency (RPA) using this form.\n<br><br>\nIf you already have a CPH number from keeping other livestock, call the RPA to get your CPH number updated to include keeping 50 poultry or other captive birds.\n<br><br>\nRural Payments Agency<br>\nTelephone (Defra rural services helpline): 03000 200 301<br>\nMonday to Friday, 8:30am to 5pm<br>\n<a href="http://www.gov.uk/call-charges"class=" govuk-link" target="_blank">Find out about call charges (opens in new tab)</a>\n</p>',
          options: {
            condition: 'BYIene'
          }
        },
        {
          name: 'GKEcri',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<h3 class="govuk-heading-m">Racing pigeons</h3>\n<p class="govuk-body">\nThere\'s a different process for racing pigeons. \n<br><br>\nFind out how to <a href="https://www.gov.uk/guidance/register-a-racing-pigeon-establishment-to-move-pigeons-to-the-eu-or-northern-ireland-for-a-race"class=" govuk-link" target="_blank">register a racing pigeon establishment to move pigeons to the EU or Northern Ireland for a race (opens in new tab)</a>.\n</p>',
          options: {
            condition: 'OFokTY'
          }
        }
      ]
    },
    {
      title: 'Legal status of your business: something else',
      path: '/legal-status-of-your-business-something-else',
      next: [
        {
          path: '/what-is-the-main-purpose-of-your-business'
        },
        {
          path: '/charity-number',
          condition: 'aEAQKS'
        },
        {
          path: '/companies-house',
          condition: 'yuNJzn'
        }
      ],
      components: [
        {
          name: 'NUaCrU',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nRPA needs the legal status of your business to register you on the Rural Payments service.\n<br>\n<br>\nRead more about <a href="https://www.gov.uk/set-up-business"class=" govuk-link" target="_blank">registering a business (opens in new tab)</a> or <a href="https://www.gov.uk/guidance/charity-types-how-to-choose-a-structure" class="govuk-link" target="_blank">find out more about charity types (opens in new tab)</a>. If you\'re not sure, seek professional advice.\n</p>',
          options: {}
        },
        {
          name: 'MfzkDz',
          title: 'Business legal status: something else',
          type: ComponentType.RadiosField,
          hint: '',
          list: 'dfccAs',
          options: {}
        }
      ]
    },
    {
      title: 'What is the main purpose of your business: something else?',
      path: '/what-is-the-main-purpose-of-your-business-something-else',
      next: [
        {
          path: '/what-type-of-business-do-you-have',
          condition: 'tEkhIS'
        },
        {
          path: '/is-your-business-a-market-showground-or-zoo'
        }
      ],
      components: [
        {
          name: 'luoxoh',
          title: 'Main purpose of your business: something else',
          type: ComponentType.RadiosField,
          hint: '',
          list: 'IOxAAj',
          options: {}
        }
      ]
    },
    {
      title:
        'Are you or your business already registered with the Rural Payments Agency?',
      path: '/are-you-or-your-business-already-registered-with-the-rural-payments-agency',
      next: [
        {
          path: '/what-country-will-you-keep-livestock-in'
        },
        {
          path: '/already-registered-with-the-rural-payments-agency',
          condition: 'fLLefX'
        }
      ],
      components: [
        {
          name: 'zcjEtV',
          title: 'Registered with the Rural Payments Agency',
          type: ComponentType.YesNoField,
          hint: '',
          options: {}
        }
      ]
    },
    {
      title: 'Already registered with the Rural Payments Agency',
      path: '/already-registered-with-the-rural-payments-agency',
      next: [],
      components: [
        {
          name: 'uqUowX',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nYou cannot use this form if you’re already registered on the Rural Payments service. The Rural Payments Agency (RPA) already has much of the information it needs to process your application. You must apply by phone instead.\n<br><br>\nTelephone (Defra rural services helpline): 03000 200 301<br>\nMonday to Friday, 8:30am to 5pm<br>\n<a href="https://www.gov.uk/call-charges" class="govuk-link" target="_blank">Find out about call charges (opens in new tab)</a>\n</p>',
          options: {}
        }
      ]
    },
    {
      title: 'Does your business have a second contact?',
      path: '/does-your-business-have-a-second-contact',
      next: [
        {
          path: '/contact-details-of-the-second-contact',
          condition: 'ZEZlNG'
        },
        {
          path: '/national-grid-field-number-for-where-youll-keep-livestock'
        }
      ],
      components: [
        {
          name: 'iszBCF',
          title: 'Business has a second contact',
          type: ComponentType.YesNoField,
          hint: '',
          options: {}
        }
      ]
    },
    {
      title: 'Contact details of the second contact',
      path: '/contact-details-of-the-second-contact',
      next: [
        {
          path: '/national-grid-field-number-for-where-youll-keep-livestock'
        },
        {
          path: '/will-you-keep-livestock-or-use-animal-by-products-at-your-home-address',
          condition: 'aCslEZ'
        }
      ],
      components: [
        {
          name: 'vCcTAU',
          title: 'Title',
          type: ComponentType.TextField,
          hint: '',
          options: {
            required: false
          },
          schema: {}
        },
        {
          name: 'MtBoTP',
          title: 'First name of second contact',
          type: ComponentType.TextField,
          hint: '',
          options: {
            required: true
          },
          schema: {}
        },
        {
          name: 'QZNQVn',
          title: 'Middle name of second contact',
          type: ComponentType.TextField,
          hint: '',
          options: {
            required: false,
            classes: 'govuk-input govuk-!-width-one-half'
          },
          schema: {}
        },
        {
          name: 'RHkcga',
          title: 'Phone number of second contact',
          type: ComponentType.TelephoneNumberField,
          hint: '',
          options: {
            required: true
          }
        },
        {
          name: 'JdIhbf',
          title: 'Last name of second contact',
          type: ComponentType.TextField,
          hint: '',
          options: {},
          schema: {}
        },
        {
          name: 'JiLYDB',
          title: 'Email address of second contact',
          type: ComponentType.EmailAddressField,
          hint: 'The email address of the second contact must be different from the main contact',
          options: {
            required: true
          }
        },
        {
          name: 'YnSTrb',
          title: 'Address for the second contact',
          type: ComponentType.UkAddressField,
          hint: '',
          options: {}
        }
      ]
    },
    {
      title: 'What do you want to tell us?',
      path: '/what-do-you-want-to-tell-us',
      next: [
        {
          path: '/rural-payments'
        }
      ],
      components: [
        {
          name: 'JKtzeY',
          title: 'Additional information',
          type: ComponentType.MultilineTextField,
          hint: '',
          options: {},
          schema: {}
        }
      ]
    },
    {
      title: 'Do you want to add a second contact?',
      path: '/do-you-want-to-add-a-second-contact',
      next: [
        {
          path: '/contact-details-of-the-second-contact',
          condition: 'WAdayu'
        },
        {
          path: '/will-you-keep-livestock-or-use-animal-by-products-at-your-home-address'
        }
      ],
      components: [
        {
          name: 'yQiBlu',
          title: 'Second contact',
          type: ComponentType.YesNoField,
          hint: 'For example, if someone else helps you keep the livestock',
          options: {}
        }
      ]
    },
    {
      title: 'The livestock must arrive within 6 weeks',
      path: '/the-livestock-must-arrive-within-6-weeks',
      next: [],
      components: [
        {
          name: 'MDtiNg',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nThe livestock or animal by-products must arrive within 6 weeks from today\'s date. \n<br><br>\nYou cannot apply for your county parish number (CPH) number now as the date you have entered is more than 6 weeks from today\'s date.\n<br><br>\nYou can return to fill in this form closer to the arrival date of your livestock or animal by-products.\n</p>',
          options: {}
        }
      ]
    },
    {
      title: 'Are you 18 or older?',
      path: '/are-you-18-or-older',
      next: [
        {
          path: '/are-you-or-your-business-already-registered-with-the-rural-payments-agency'
        },
        {
          path: '/you-must-be-18-or-older-to-use-this-service',
          condition: 'VHfpoC'
        }
      ],
      components: [
        {
          name: 'JGLmzy',
          title: '18 or older',
          type: ComponentType.YesNoField,
          hint: '',
          options: {}
        }
      ]
    },
    {
      title: 'You must be 18 or older to use this service',
      path: '/you-must-be-18-or-older-to-use-this-service',
      next: [],
      components: [
        {
          name: 'acXfVy',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">\nTo apply for a country parish holding (CPH) number, you must be 18 or older.\n</p>',
          options: {}
        }
      ]
    }
  ],
  lists: [
    {
      title: 'What is the legal status of your business?',
      name: 'ihwVmQ',
      type: 'string',
      items: [
        {
          text: 'Sole trader',
          value: 'Sole trader'
        },
        {
          text: 'Private limited company (Ltd)',
          value: 'Private limited company (Ltd)'
        },
        {
          text: 'Partnership',
          value: 'Partnership'
        },
        {
          text: 'Limited partnership (LP)',
          value: 'Limited partnership (LP)'
        },
        {
          text: 'Charitable trust',
          value: 'Charitable trust'
        },
        {
          text: 'Limited liability partnership (LLP)',
          value: 'Limited liability partnership (LLP)'
        },
        {
          text: 'Charitable incorporated organisation (CIO)',
          value: 'Charitable incorporated organisation (CIO)'
        },
        {
          text: 'Government (local)',
          value: 'Government (local)'
        },
        {
          text: 'Public limited company (PLC)',
          value: 'Public limited company (PLC)'
        },
        {
          text: 'Community interest company (CIC)',
          value: 'Community interest company (CIC)'
        },
        {
          text: 'Non-UK company',
          value: 'Non-UK company'
        },
        {
          text: 'The Crown',
          value: 'The Crown'
        },
        {
          text: 'Unlimited company (Ultd)',
          value: 'Unlimited company (Ultd)'
        },
        {
          text: 'Government (central)',
          value: 'Government (central)'
        }
      ]
    },
    {
      title: 'Companies House',
      name: 'gqNQpU',
      type: 'string',
      items: [
        {
          text: 'Community interest company (CIC)',
          value: 'Community interest company (CIC)'
        },
        {
          text: 'Limited liability partnership (LLP)',
          value: 'Limited liability partnership (LLP)'
        },
        {
          text: 'Limited partnership (LP)',
          value: 'Limited partnership (LP)'
        },
        {
          text: 'Non-UK company',
          value: 'Non-UK company'
        },
        {
          text: 'Private limited company (Ltd)',
          value: 'Private limited company (Ltd)'
        },
        {
          text: 'Public limited company (PLC)',
          value: 'Public limited company (PLC)'
        },
        {
          text: 'Unlimited company (Ultd)',
          value: 'Unlimited company (Ultd)'
        }
      ]
    },
    {
      title: 'Animal by-products and livestock',
      name: 'CzxRVp',
      type: 'string',
      items: [
        {
          text: 'livestock only',
          value: 'livestock only'
        },
        {
          text: 'livestock and animal by-products',
          value: 'livestock and animal by-products'
        },
        {
          text: 'animal by-products only',
          value: 'animal by-products only'
        }
      ]
    },
    {
      title: 'Business type',
      name: 'ycOtLx',
      type: 'string',
      items: [
        {
          text: 'Hobby livestock keeper - if you keep livestock for a hobby or as a pet',
          value:
            'Hobby livestock keeper - if you keep livestock for a hobby or as a pet'
        },
        {
          text: 'Professional livestock keeper - if you keep livestock as your profession',
          value:
            'Professional livestock keeper - if you keep livestock as your profession'
        },
        {
          text: 'Farmer',
          value: 'Farmer'
        },
        {
          text: 'Meat industry',
          value: 'Meat industry'
        },
        {
          text: 'Land manager',
          value: 'Land manager'
        },
        {
          text: 'Education provider or trainer',
          value: 'Education provider or trainer'
        },
        {
          text: 'Rural community, voluntary or third sector organisation',
          value: 'Rural community, voluntary or third sector organisation'
        },
        {
          text: 'Tourism',
          value: 'Tourism'
        },
        {
          text: 'Forestry or woodland owner',
          value: 'Forestry or woodland owner'
        },
        {
          text: 'Horticultural business',
          value: 'Horticultural business'
        },
        {
          text: 'Central or local government',
          value: 'Central or local government'
        },
        {
          text: 'Trader only organisation',
          value: 'Trader only organisation'
        },
        {
          text: 'Intervention or private storage',
          value: 'Intervention or private storage'
        },
        {
          text: 'Commons or graziers association',
          value: 'Commons or graziers association'
        },
        {
          text: 'Leader group',
          value: 'Leader group'
        },
        {
          text: 'Official receiver or administrator',
          value: 'Official receiver or administrator'
        },
        {
          text: 'Other',
          value: 'Other'
        }
      ]
    },
    {
      title: 'Livestock you keep',
      name: 'CoRNqi',
      type: 'string',
      items: [
        {
          text: 'Cattle',
          value: 'Cattle'
        },
        {
          text: 'Camelids ',
          value: 'Camelids ',
          description: 'For example, llamas, camels, alpacas'
        },
        {
          text: 'Deer',
          value: 'Deer'
        },
        {
          text: 'Goats',
          value: 'Goats'
        },
        {
          text: 'Pigs',
          value: 'Pigs'
        },
        {
          text: 'Sheep',
          value: 'Sheep'
        },
        {
          text: 'More than 50 poultry',
          value: 'More than 50 poultry'
        },
        {
          text: 'Less than 50 poultry or other captive birds',
          value: 'Less than 50 poultry or other captive birds'
        },
        {
          text: 'Racing pigeons',
          value: 'Racing pigeons',
          description: 'Only if racing in the EU or Northern Ireland'
        },
        {
          text: 'Animal by-products',
          value: 'Animal by-products',
          description:
            'For example, hides and skins from slaughterhouses, processed animal proteins, carcasses '
        }
      ]
    },
    {
      title: 'business a market, showground or zoo',
      name: 'rieXPV',
      type: 'string',
      items: [
        {
          text: 'Market',
          value: 'Market'
        },
        {
          text: 'Showground',
          value: 'Showground'
        },
        {
          text: 'Zoo',
          value: 'Zoo'
        },
        {
          text: 'None of the above',
          value: 'None of the above'
        }
      ]
    },
    {
      title: "National Grid field number for where you'll keep livestock",
      name: 'OxfbRE',
      type: 'string',
      items: [
        {
          text: 'pet owner, this might be a back yard, garden or piece of land attached to your house',
          value:
            'pet owner, this might be a back yard, garden or piece of land attached to your house'
        },
        {
          text: 'hobby livestock keeper, this might be a community allotment, back yard or a piece of of land you own',
          value:
            'hobby livestock keeper, this might be a community allotment, back yard or a piece of of land you own'
        },
        {
          text: 'professional livestock keeper or farmer, this would be the gathering point on your farm yard or main field',
          value:
            'professional livestock keeper or farmer, this would be the gathering point on your farm yard or main field'
        }
      ]
    },
    {
      title: 'Country',
      name: 'oNaqxb',
      type: 'string',
      items: [
        {
          text: 'England',
          value: 'England'
        },
        {
          text: 'Northern Ireland',
          value: 'Northern Ireland'
        },
        {
          text: 'Scotland',
          value: 'Scotland'
        },
        {
          text: 'Wales',
          value: 'Wales'
        }
      ]
    },
    {
      title: 'Hobbyist or business',
      name: 'IGZhBB',
      type: 'string',
      items: [
        {
          text: "I'm a hobbyist keeper",
          value: 'Im a hobbyist keeper'
        },
        {
          text: "I'm registering on behalf of a business",
          value: 'Im registering on behalf of a business'
        }
      ]
    },
    {
      title: 'Top 5 legal statuses for businesses',
      name: 'LLfsSM',
      type: 'string',
      items: [
        {
          text: 'Sole trader',
          value: 'Sole trader'
        },
        {
          text: 'Partnership',
          value: 'Partnership'
        },
        {
          text: 'Private limited company (Ltd)',
          value: 'Private limited company Ltd'
        },
        {
          text: 'Limited partnership (LP)',
          value: 'Limited partnership LP'
        },
        {
          text: 'Charitable trust',
          value: 'Charitable trust'
        },
        {
          text: 'Something else',
          value: 'Something else'
        }
      ]
    },
    {
      title: 'Less used legal statuses for businesses',
      name: 'dfccAs',
      type: 'string',
      items: [
        {
          text: 'Charitable incorporated organisation (CIO)',
          value: 'Charitable incorporated organisation CIO'
        },
        {
          text: 'Community interest company (CIC)',
          value: 'Community interest company CIC'
        },
        {
          text: 'Limited liability partnership (LLP)',
          value: 'Limited liability partnership LLP'
        },
        {
          text: 'Government (local)',
          value: 'Government local'
        },
        {
          text: 'Public limited company (PLC)',
          value: 'Public limited company PLC'
        },
        {
          text: 'The Crown',
          value: 'The Crown'
        },
        {
          text: 'Non-UK company',
          value: 'Non-UK company'
        },
        {
          text: 'Unlimited company (Ultd)',
          value: 'Unlimited company Ultd'
        },
        {
          text: 'Government (central)',
          value: 'Government central'
        }
      ]
    },
    {
      title: 'Top 5 business types',
      name: 'kMOALL',
      type: 'string',
      items: [
        {
          text: 'Farmer',
          value: 'Farmer'
        },
        {
          text: 'Professional livestock keeper',
          value: 'Professional livestock keeper'
        },
        {
          text: 'Meat industry',
          value: 'Meat industry'
        },
        {
          text: 'Land manager',
          value: 'Land manager'
        },
        {
          text: 'Education provider or trainer',
          value: 'Education provider or trainer'
        },
        {
          text: 'Something else',
          value: 'Something else'
        }
      ]
    },
    {
      title: 'Lesser used business types',
      name: 'IOxAAj',
      type: 'string',
      items: [
        {
          text: 'Forestry or woodland owner',
          value: 'Forestry or woodland owner'
        },
        {
          text: 'Tourism',
          value: 'Tourism'
        },
        {
          text: 'Rural community, voluntary or third sector organisation',
          value: 'Rural community, voluntary or third sector organisation'
        },
        {
          text: 'Horticultural business',
          value: 'Horticultural business'
        },
        {
          text: 'Trader only organisation',
          value: 'Trader only organisation'
        },
        {
          text: 'Intervention or private storage',
          value: 'Intervention or private storage'
        },
        {
          text: 'Central or local government',
          value: 'Central or local government'
        },
        {
          text: 'Commons or graziers association',
          value: 'Commons or graziers association'
        },
        {
          text: 'Leader group',
          value: 'Leader group'
        },
        {
          text: 'Other',
          value: 'Other'
        }
      ]
    }
  ],
  sections: [
    {
      title: 'Contact details',
      name: 'dhpiZu',
      hideTitle: true
    }
  ],
  conditions: [
    {
      displayName: 'livestock only',
      name: 'HkZPxJ',
      value: {
        name: 'livestock only',
        conditions: [
          {
            field: {
              name: 'iXwGcW',
              type: ComponentType.RadiosField,
              display: 'What do you want to register?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'livestock only',
              display: 'livestock only'
            }
          }
        ]
      }
    },
    {
      displayName: 'livestock and animal by-products',
      name: 'lMZXws',
      value: {
        name: 'livestock and animal by-products',
        conditions: [
          {
            field: {
              name: 'iXwGcW',
              type: ComponentType.RadiosField,
              display: 'What do you want to register?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'livestock and animal by-products',
              display: 'livestock and animal by-products'
            }
          }
        ]
      }
    },
    {
      displayName: 'animal by-products only',
      name: 'uiTSgY',
      value: {
        name: 'animal by-products only',
        conditions: [
          {
            field: {
              name: 'iXwGcW',
              type: ComponentType.RadiosField,
              display: 'What do you want to register?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'animal by-products only',
              display: 'animal by-products only'
            }
          }
        ]
      }
    },
    {
      displayName: 'Business address is not the same as home address',
      name: 'BpTXyI',
      value: {
        name: 'Business address is not the same as home address',
        conditions: [
          {
            field: {
              name: 'CMTiOK',
              type: ComponentType.YesNoField,
              display: 'Is your business address the same as your home address?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'false'
            }
          }
        ]
      }
    },
    {
      displayName:
        "Does not contain 'Other or my business uses animal by-products'",
      name: 'TngqpM',
      value: {
        name: "Does not contain 'Other or my business uses animal by-products'",
        conditions: [
          {
            field: {
              name: 'livestock-keep',
              type: ComponentType.CheckboxesField,
              display: 'What livestock do you keep?'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Other or my business uses animal by-products',
              display: 'Other or my business uses animal by-products'
            }
          }
        ]
      }
    },
    {
      displayName: 'No - will not keep livestock at business address',
      name: 'FoYTFn',
      value: {
        name: 'No - will not keep livestock at business address',
        conditions: [
          {
            field: {
              name: 'QcfaVC',
              type: ComponentType.YesNoField,
              display:
                'Will you keep livestock or use animal by-products at your home address?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'false'
            }
          }
        ]
      }
    },
    {
      displayName:
        'No - Will you keep livestock or use animal by-products anywhere else?',
      name: 'qLowJn',
      value: {
        name: 'No - Will you keep livestock or use animal by-products anywhere else?',
        conditions: [
          {
            field: {
              name: 'MBoevI',
              type: ComponentType.YesNoField,
              display:
                'Will you keep livestock or use animal by-products anywhere else?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'false'
            }
          }
        ]
      }
    },
    {
      displayName: 'No - will not keep livestock at home address',
      name: 'jxSqwt',
      value: {
        name: 'No - will not keep livestock at home address',
        conditions: [
          {
            field: {
              name: 'QcfaVC',
              type: ComponentType.YesNoField,
              display:
                'Will you keep livestock or use animal by-products at your home address?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'false'
            }
          }
        ]
      }
    },
    {
      displayName: 'Yes - will keep livestock at business address',
      name: 'BStxIv',
      value: {
        name: 'Yes - will keep livestock at business address',
        conditions: [
          {
            field: {
              name: 'RiEsSm',
              type: ComponentType.YesNoField,
              display:
                'Will you keep livestock or use animal by-products at your business address?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'true',
              display: 'true'
            }
          }
        ]
      }
    },
    {
      displayName: 'No - do not own the land',
      name: 'yTTblu',
      value: {
        name: 'No - do not own the land',
        conditions: [
          {
            field: {
              name: 'rOgnUv',
              type: ComponentType.YesNoField,
              display: 'Do you own the land?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'false'
            }
          }
        ]
      }
    },
    {
      displayName: 'Yes - the landowner has a CPH number for the land',
      name: 'pOUOIi',
      value: {
        name: 'Yes - the landowner has a CPH number for the land',
        conditions: [
          {
            field: {
              name: 'qLmGSL',
              type: ComponentType.YesNoField,
              display: 'Is your tenancy agreement for more than one year?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'true',
              display: 'true'
            }
          }
        ]
      }
    },
    {
      displayName: 'Yes - tenancy agreement is for more than one year',
      name: 'jHDHJK',
      value: {
        name: 'Yes - tenancy agreement is for more than one year',
        conditions: [
          {
            field: {
              name: 'qLmGSL',
              type: ComponentType.YesNoField,
              display: 'Is your tenancy agreement for more than one year?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'true',
              display: 'true'
            }
          }
        ]
      }
    },
    {
      displayName: 'No - tenancy agreement is not for more than one year',
      name: 'WgVJGi',
      value: {
        name: 'No - tenancy agreement is not for more than one year',
        conditions: [
          {
            field: {
              name: 'qLmGSL',
              type: ComponentType.YesNoField,
              display: 'Is your tenancy agreement for more than one year?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'false'
            }
          }
        ]
      }
    },
    {
      displayName: 'Yes - own the land',
      name: 'VtzzTR',
      value: {
        name: 'Yes - own the land',
        conditions: [
          {
            field: {
              name: 'rOgnUv',
              type: ComponentType.YesNoField,
              display: 'Do you own the land?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'true',
              display: 'true'
            }
          }
        ]
      }
    },
    {
      displayName: 'No - not registered with Companies House',
      name: 'GhOaqI',
      value: {
        name: 'No - not registered with Companies House',
        conditions: [
          {
            field: {
              name: 'rJIKfO',
              type: ComponentType.YesNoField,
              display: 'Is your business registered with Companies House?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'false'
            }
          }
        ]
      }
    },
    {
      displayName: 'No - not registered with the Charity Commission',
      name: 'cGDdyD',
      value: {
        name: 'No - not registered with the Charity Commission',
        conditions: [
          {
            field: {
              name: 'DRrBSz',
              type: ComponentType.YesNoField,
              display: 'Is your charity registered with the Charity Commission?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'false'
            }
          }
        ]
      }
    },
    {
      displayName: 'Must have a charity number',
      name: 'HhHvCo',
      value: {
        name: 'Must have a charity number',
        conditions: [
          {
            field: {
              name: 'yHQAol',
              type: ComponentType.RadiosField,
              display: 'Business legal status'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Charitable trust',
              display: 'Charitable trust'
            }
          }
        ]
      }
    },
    {
      name: 'PxBtNC',
      displayName: 'Not a business (Applying on behalf of a business)',
      value: {
        name: 'Not a business (Applying on behalf of a business)',
        conditions: [
          {
            field: {
              name: 'mSqqmJ',
              type: ComponentType.YesNoField,
              display: 'Applying on behalf of a business'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'No'
            }
          }
        ]
      }
    },
    {
      name: 'WHxsFL',
      displayName: 'Northern Ireland, Scotland or Wales',
      value: {
        name: 'Northern Ireland, Scotland or Wales',
        conditions: [
          {
            field: {
              name: 'aYjRCZ',
              type: ComponentType.RadiosField,
              display: 'Country where you will keep livestock'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Scotland',
              display: 'Scotland'
            }
          },
          {
            coordinator: Coordinator.OR,
            field: {
              name: 'aYjRCZ',
              type: ComponentType.RadiosField,
              display: 'Country where you will keep livestock'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Wales',
              display: 'Wales'
            }
          },
          {
            coordinator: Coordinator.OR,
            field: {
              name: 'aYjRCZ',
              type: ComponentType.RadiosField,
              display: 'Country where you will keep livestock'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Northern Ireland',
              display: 'Northern Ireland'
            }
          }
        ]
      }
    },
    {
      name: 'KzDEBv',
      displayName: 'Contains animal by-products',
      value: {
        name: 'Contains animal by-products',
        conditions: [
          {
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.Contains,
            value: {
              type: ConditionType.Value,
              value: 'Animal by-products',
              display: 'Animal by-products'
            }
          }
        ]
      }
    },
    {
      name: 'SmRHwO',
      displayName: 'Hobbyist',
      value: {
        name: 'Hobbyist',
        conditions: [
          {
            field: {
              name: 'FsSpLA',
              type: ComponentType.RadiosField,
              display: 'Are you a hobbyist keeper or a business?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Im a hobbyist keeper',
              display: "I'm a hobbyist keeper"
            }
          }
        ]
      }
    },
    {
      name: 'NqsUxW',
      displayName: 'Business legal status is something else',
      value: {
        name: 'Business legal status is something else',
        conditions: [
          {
            field: {
              name: 'yHQAol',
              type: ComponentType.RadiosField,
              display: 'Business legal status'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Something else',
              display: 'Something else'
            }
          }
        ]
      }
    },
    {
      name: 'aEAQKS',
      displayName: 'Is Charitable incorporated organisation (CIO)',
      value: {
        name: 'Is Charitable incorporated organisation (CIO)',
        conditions: [
          {
            field: {
              name: 'MfzkDz',
              type: ComponentType.RadiosField,
              display: 'Business legal status: something else'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Charitable incorporated organisation CIO',
              display: 'Charitable incorporated organisation (CIO)'
            }
          }
        ]
      }
    },
    {
      name: 'mLnJPE',
      displayName: 'Main business type is something else',
      value: {
        name: 'Main business type is something else',
        conditions: [
          {
            field: {
              name: 'AoofuF',
              type: ComponentType.RadiosField,
              display: 'Business type'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Something else',
              display: 'Something else'
            }
          }
        ]
      }
    },
    {
      name: 'tEkhIS',
      displayName: 'Other business type',
      value: {
        name: 'Other business type',
        conditions: [
          {
            field: {
              name: 'luoxoh',
              type: ComponentType.RadiosField,
              display: 'Main purpose of your business: something else'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Other',
              display: 'Other'
            }
          }
        ]
      }
    },
    {
      name: 'fLLefX',
      displayName: 'Yes - already registered with RPA',
      value: {
        name: 'Yes - already registered with RPA',
        conditions: [
          {
            field: {
              name: 'zcjEtV',
              type: ComponentType.YesNoField,
              display: 'Registered with the Rural Payments Agency'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'true',
              display: 'Yes'
            }
          }
        ]
      }
    },
    {
      name: 'dfoUtU',
      displayName: 'Less than 50 birds',
      value: {
        name: 'Less than 50 birds',
        conditions: [
          {
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.Contains,
            value: {
              type: ConditionType.Value,
              value: 'Less than 50 poultry or other captive birds',
              display: 'Less than 50 poultry or other captive birds'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Cattle',
              display: 'Cattle'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Sheep',
              display: 'Sheep'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Goats',
              display: 'Goats'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Pigs',
              display: 'Pigs'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Deer',
              display: 'Deer'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'More than 50 birds',
              display: 'More than 50 birds'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Animal by-products',
              display: 'Animal by-products'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Camelids ',
              display: 'Camelids '
            }
          },
          {
            coordinator: Coordinator.OR,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.Contains,
            value: {
              type: ConditionType.Value,
              value: 'Racing pigeons',
              display: 'Racing pigeons'
            }
          }
        ]
      }
    },
    {
      name: 'Mofdix',
      displayName:
        'Does not need a charity number or Companies house number and is not something else',
      value: {
        name: 'Does not need a charity number or Companies house number and is not something else',
        conditions: [
          {
            field: {
              name: 'yHQAol',
              type: ComponentType.RadiosField,
              display: 'Business legal status'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Sole trader',
              display: 'Sole trader'
            }
          },
          {
            coordinator: Coordinator.OR,
            field: {
              name: 'yHQAol',
              type: ComponentType.RadiosField,
              display: 'Business legal status'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Partnership',
              display: 'Partnership'
            }
          }
        ]
      }
    },
    {
      name: 'ZEZlNG',
      displayName: 'Yes - business has a second contact',
      value: {
        name: 'Yes - business has a second contact',
        conditions: [
          {
            field: {
              name: 'iszBCF',
              type: ComponentType.YesNoField,
              display: 'Business has a second contact'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'true',
              display: 'Yes'
            }
          }
        ]
      }
    },
    {
      name: 'oKXMlf',
      displayName: 'Business type is not sole trader',
      value: {
        name: 'Business type is not sole trader',
        conditions: [
          {
            field: {
              name: 'yHQAol',
              type: ComponentType.RadiosField,
              display: 'Business legal status'
            },
            operator: OperatorName.IsNot,
            value: {
              type: ConditionType.Value,
              value: 'Sole trader',
              display: 'Sole trader'
            }
          }
        ]
      }
    },
    {
      name: 'jJEMOD',
      displayName: 'Not a business',
      value: {
        name: 'Not a business',
        conditions: [
          {
            field: {
              name: 'FsSpLA',
              type: ComponentType.RadiosField,
              display: 'Are you a hobbyist keeper or a business?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Im a hobbyist keeper',
              display: "I'm a hobbyist keeper"
            }
          }
        ]
      }
    },
    {
      name: 'MrMPHC',
      displayName: 'Yes - want to tell us something else',
      value: {
        name: 'Yes - want to tell us something else',
        conditions: [
          {
            field: {
              name: 'ledUEN',
              type: ComponentType.YesNoField,
              display: 'Anything else to tell us'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'true',
              display: 'Yes'
            }
          }
        ]
      }
    },
    {
      name: 'WAdayu',
      displayName: 'Yes - hobbyist keeper wants to add a second contact',
      value: {
        name: 'Yes - hobbyist keeper wants to add a second contact',
        conditions: [
          {
            field: {
              name: 'yQiBlu',
              type: ComponentType.YesNoField,
              display: 'Second contact'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'true',
              display: 'Yes'
            }
          }
        ]
      }
    },
    {
      name: 'aCslEZ',
      displayName: 'is hobbyist keeper',
      value: {
        name: 'is hobbyist keeper',
        conditions: [
          {
            field: {
              name: 'FsSpLA',
              type: ComponentType.RadiosField,
              display: 'Are you a hobbyist keeper or a business?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Im a hobbyist keeper',
              display: "I'm a hobbyist keeper"
            }
          }
        ]
      }
    },
    {
      name: 'oQKstF',
      displayName: 'Livestock not within 6 weeks',
      value: {
        name: 'Livestock not within 6 weeks',
        conditions: [
          {
            field: {
              name: 'uogTBM',
              type: ComponentType.DatePartsField,
              display:
                'What date will the livestock or animal by-products arrive?'
            },
            operator: OperatorName.IsMoreThan,
            value: {
              type: ConditionType.RelativeDate,
              period: '56',
              unit: DateUnits.DAYS,
              direction: DateDirections.FUTURE
            }
          }
        ]
      }
    },
    {
      name: 'OFokTY',
      displayName: 'Racing pigeons only',
      value: {
        name: 'Racing pigeons only',
        conditions: [
          {
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Cattle',
              display: 'Cattle'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Camelids ',
              display: 'Camelids '
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Deer',
              display: 'Deer'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Goats',
              display: 'Goats'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Pigs',
              display: 'Pigs'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Sheep',
              display: 'Sheep'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'More than 50 poultry',
              display: 'More than 50 poultry'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Animal by-products',
              display: 'Animal by-products'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.Contains,
            value: {
              type: ConditionType.Value,
              value: 'Racing pigeons',
              display: 'Racing pigeons'
            }
          }
        ]
      }
    },
    {
      name: 'yuNJzn',
      displayName:
        'Less used legal statuses - must have a companies house number',
      value: {
        name: 'Less used legal statuses - must have a companies house number',
        conditions: [
          {
            field: {
              name: 'MfzkDz',
              type: ComponentType.RadiosField,
              display: 'Business legal status: something else'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Community interest company CIC',
              display: 'Community interest company (CIC)'
            }
          },
          {
            coordinator: Coordinator.OR,
            field: {
              name: 'MfzkDz',
              type: ComponentType.RadiosField,
              display: 'Business legal status: something else'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Limited liability partnership LLP',
              display: 'Limited liability partnership (LLP)'
            }
          },
          {
            coordinator: Coordinator.OR,
            field: {
              name: 'MfzkDz',
              type: ComponentType.RadiosField,
              display: 'Business legal status: something else'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Non-UK company',
              display: 'Non-UK company'
            }
          },
          {
            coordinator: Coordinator.OR,
            field: {
              name: 'MfzkDz',
              type: ComponentType.RadiosField,
              display: 'Business legal status: something else'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Public limited company PLC',
              display: 'Public limited company (PLC)'
            }
          },
          {
            coordinator: Coordinator.OR,
            field: {
              name: 'MfzkDz',
              type: ComponentType.RadiosField,
              display: 'Business legal status: something else'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Unlimited company Ultd',
              display: 'Unlimited company (Ultd)'
            }
          }
        ]
      }
    },
    {
      name: 'WWZpek',
      displayName: 'Must have a companies house number',
      value: {
        name: 'Must have a companies house number',
        conditions: [
          {
            field: {
              name: 'yHQAol',
              type: ComponentType.RadiosField,
              display: 'Business legal status'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Private limited company Ltd',
              display: 'Private limited company (Ltd)'
            }
          },
          {
            coordinator: Coordinator.OR,
            field: {
              name: 'yHQAol',
              type: ComponentType.RadiosField,
              display: 'Business legal status'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Limited partnership LP',
              display: 'Limited partnership (LP)'
            }
          }
        ]
      }
    },
    {
      name: 'VHfpoC',
      displayName: 'Not 18 years old',
      value: {
        name: 'Not 18 years old',
        conditions: [
          {
            field: {
              name: 'JGLmzy',
              type: ComponentType.YesNoField,
              display: '18 or older'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'No'
            }
          }
        ]
      }
    },
    {
      name: 'BYIene',
      displayName: 'Less than 50 birds only',
      value: {
        name: 'Less than 50 birds only',
        conditions: [
          {
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.Contains,
            value: {
              type: ConditionType.Value,
              value: 'Less than 50 poultry or other captive birds',
              display: 'Less than 50 poultry or other captive birds'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Cattle',
              display: 'Cattle'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Camelids ',
              display: 'Camelids '
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Deer',
              display: 'Deer'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Goats',
              display: 'Goats'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Pigs',
              display: 'Pigs'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Sheep',
              display: 'Sheep'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'More than 50 poultry',
              display: 'More than 50 poultry'
            }
          },
          {
            coordinator: Coordinator.AND,
            field: {
              name: 'vumpmr',
              type: ComponentType.CheckboxesField,
              display: 'Livestock that you keep'
            },
            operator: OperatorName.DoesNotContain,
            value: {
              type: ConditionType.Value,
              value: 'Animal by-products',
              display: 'Animal by-products'
            }
          }
        ]
      }
    }
  ],
  outputEmail: 'cph_online_form@rpa.gov.uk'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
