# React Migration Status

React components implemented for login/register, dashboard, subscriptions CRUD, payments CRUD, and community posts/comments/likes/reports. Existing calendar, savings and profile remain accessible at `/legacy/index.html`. This is intentionally a staged migration: not every legacy page has been rewritten.

Important compatibility: subscription API expects lowercase `monthly|weekly|yearly` and `active|review`; React form matches backend. API mutations retrieve CSRF token before each request to tolerate session rotation.

Verification performed: ZIP integrity and source checks. `npm install --offline` could not resolve React from cache, so no Vite production build/browser test was possible here. Maven is not installed in this environment, so backend compilation is also unverified.
