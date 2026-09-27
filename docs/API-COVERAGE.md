# API coverage

All URLs below include /api. Error responses preserve message, code and validationErrors. Catalog routes require a signed-in customer/admin, matching SecurityConfig.

| Resource | Endpoints | Frontend entry |
| --- | --- | --- |
| Authentication | POST auth/register, auth/login, auth/refresh, auth/logout | Signup, signin, shared refresh, header sign-out |
| Customer movies | GET catalog/movies, movies/search?title, movies/{id} | Discover, search, detail |
| Customer theaters | GET catalog/cities/{id}/theaters | Cinemas and movie city filter; configured city IDs |
| Customer shows | GET catalog/movies/{id}/shows, shows/range?start&end | All upcoming / date selector |
| Show details | GET catalog/shows/{id}, shows/{id}/seats | Seat-selection page |
| Seat holds | POST seat-holds, GET seat-holds/{id}, DELETE seat-holds/{id} | Reserve, verify/poll, release |
| Bookings | POST bookings, GET bookings, GET bookings/{id} | Checkout, My tickets, ticket detail |
| Cancellation | POST bookings/{id}/cancel | Confirmation dialog and returned refund |
| Payments | POST payments/bookings/{id} + Idempotency-Key | Checkout and pending booking recovery |
| Admin cities | POST/GET admin/cities, GET cities/{id} | Cities create/list/detail |
| Admin movies | POST/GET admin/movies, GET movies/{id}, search?title, language?language, genre?genre | Movies create/list/detail/filter |
| Admin theaters | POST/GET admin/theaters, GET theaters/{id}, city/{id}, search?name | Theaters create/list/detail/filter |
| Admin screens | POST/GET admin/screens, GET screens/{id}, theater/{id} | Screens create/list/detail/filter |
| Admin seats | POST admin/seats/layout, GET seats/{id}, screen/{id} | Seat layouts generator/list/detail |
| Admin shows | POST admin/shows, GET shows/{id}, movie/{id}, screen/{id}, movie/{id}/range | Shows create/detail/filter/date range |
| Admin discounts | POST/GET admin/discount-codes, PATCH {id}/active?active | Discount creation/list/toggle |
| Admin refund policies | POST/GET admin/refund-policies, PATCH {id}/active?active | Policy creation/list/toggle |
| Admin users | PATCH admin/users/make-admin | Team access with explicit confirmation |

## Behavioral boundaries

- The UI does not compute final discounts or refund entitlements ahead of the server.
- A payment timeout retains its key and method across reloads and routes. A definitive FAILED response clears the attempt for a deliberate retry. Mutation requests are not automatically retried after network failures.
- Booking creation has no idempotency header. On an uncertain response, the UI checks the customer's pending bookings for the same show and exact seats before asking for another attempt.
- Seat availability is polled; the hold API remains authoritative when seats race.
- There is no public city directory, all-shows endpoint, payment status GET, refund history GET, poster field or catalog editing endpoint. Configuration, scoped queries and returned mutation results are used accordingly.
- Admin routes are hidden/guarded for customers; the backend remains the security authority.
