# SNS per-form topic routing

By default, all form submissions are published to a single global SNS topic configured via `SNS_ADAPTER_TOPIC_ARN`, however we can additionally route specific forms to their own SNS topics.

When a form is submitted, the runner always publishes to the global topic. If the submitted form's ID is present in the per-form topic map, the exact same payload is also published to the configured topic for that form.

## Pre-requisites

Before any submission messages can be sent on a per-form basis, there are some infrastructure requirements that need to be done between the team that owns the form and the Defra Forms team.

The Defra Forms team is responsible for creating and owning the SNS Topic.
The service that owns the form is responsible for creating and owning the SQS Queue where the submissions will be sent and the subscription to the queue.

Follow these CDP [instructions](https://portal.cdp-int.defra.cloud/documentation/how-to/sqs-sns.md#sns-sqs-creation-and-subscription-at-the-same-time-) to create all three at the same time.

Follow this example below and use

- the SNS Topic naming convention `forms_runner_submission_events_tenant_${owning_service_name}_${form_name}`
- the SQS Queue naming convention `${owning_service_name}-${form_name}-form`

```
Hello CDP Support :wave: Please can I request an SNS/SQS creation and subscription with the following details:

SQS QUEUE CREATION

sqs_queue_name - epr-laps-feedback-form
owning_service - epr-laps
queue_type – Standard

SNS TOPIC CREATION

sns_topic_name - forms_runner_submission_events_tenant_erp_laps_feedback
owning_service - forms-runner
topic_type – Standard

SNS/SQS SUBSCRIPTION CREATION

owning_service - epr-laps
sqs_queue_name_subscribing - epr-laps-feedback-form
sns_topic_name_to_subscribe_to - forms_runner_submission_events_tenant_erp_laps_feedback

Thank you
```

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
