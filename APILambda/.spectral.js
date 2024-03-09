import ibmCloudValidationRules from '@ibm-cloud/openapi-ruleset';
import { schemas } from '@ibm-cloud/openapi-ruleset-utilities/src/collections';
import { propertyCasingConvention } from '@ibm-cloud/openapi-ruleset/src/functions';

export default {
  extends: ibmCloudValidationRules,
  rules: {
    'ibm-parameter-casing-convention': {
      description: 'Path parameter names must be camel case',
      message: '{{error}}',
      resolved: true,
      given: schemas,
      severity: 'warn',
      then: {
        function: propertyCasingConvention,
        functionOptions: {
          type: 'camel'
        }
      }
    },
    'ibm-property-casing-convention': {
      description: 'Property names must be camel case',
      message: '{{error}}',
      resolved: true,
      given: schemas,
      severity: 'warn',
      then: {
        function: propertyCasingConvention,
        functionOptions: {
          type: 'camel'
        }
      }
    },
    'ibm-enum-casing-convention': {
      description: 'Enum values must be camel case',
      message: '{{error}}',
      resolved: true,
      given: schemas,
      severity: 'warn',
      then: {
        function: propertyCasingConvention,
        functionOptions: {
          type: 'camel'
        }
      }
    }
  }
};
