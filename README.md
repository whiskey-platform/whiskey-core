# Whiskey Platform - Core Infrastructure

Whiskey is a sprawling cloud-native event-sourced personal automation platform.

This repository hosts the core infrastructure upon which the rest of the project is built.

## Contents

- `api-infra/` - hosts the core API infrastructure for the microservices and apps across the [project](https://github.com/whiskey-platform) to hook into. This has been here since the beginning.
- `event-infra/` - hosts the core EventBridge Event Bus that funnels events from sources across my 'intranet' and the broader internet to targets for handling. This is new, based on a re-architecture away from SNS as the event-routing service.
