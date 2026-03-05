# SNS per-form topic routing

By default, all form submissions are published to a single global SNS topic configured via `SNS_ADAPTER_TOPIC_ARN`, however we can additionally route specific forms to their own SNS topics.

When a form is submitted, the runner always publishes to the global topic. If the submitted form's ID is present in the per-form topic map, the exact same payload is also published to the configured topic for that form.

## Configuration

Set the `SNS_FORM_TOPIC_ARN_MAP` environment variable to a JSON object that maps form IDs to SNS topic ARNs. Environment variables are managed in the [cdp-app-config](https://github.com/defra/cdp-app-config) repository.

```
SNS_FORM_TOPIC_ARN_MAP='{"<formId>":"<topicArn>"}'
```

### Example

```
SNS_FORM_TOPIC_ARN_MAP='{"abc123":"arn:aws:sns:eu-west-2:123456789012:my-form-topic","def456":"arn:aws:sns:eu-west-2:123456789012:another-form-topic"}'
```

In this example:

- Form `abc123` publishes to the global topic and to `my-form-topic`
- Form `def456` publishes to the global topic and to `another-form-topic`
- All other forms publish to the global topic only

## Future direction

The longer-term intention is to move this configuration into Designer, allowing form authors to add additional outputs directly against a form without requiring an environment variable change. This approach was not implemented due to time constraints and a deadline. The environment variable solution described here is the interim approach until that work is prioritised.

## Notes

- The variable must be valid JSON. An invalid value will cause the application to fail on startup.
- The payload published to the form-specific topic is identical to the one sent to the global topic.
- If `SNS_FORM_TOPIC_ARN_MAP` is not set, all forms publish to the global topic only — there is no change in behaviour.
