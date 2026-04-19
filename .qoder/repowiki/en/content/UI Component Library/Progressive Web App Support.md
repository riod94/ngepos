# Progressive Web App Support

<cite>
**Referenced Files in This Document**
- [sw.js](file://public/sw.js)
- [manifest.json](file://public/manifest.json)
- [offline.html](file://public/offline.html)
- [app.tsx](file://src/app.tsx)
- [entry-client.tsx](file://src/entry-client.tsx)
- [entry-server.tsx](file://src/entry-server.tsx)
- [vite.config.ts](file://vite.config.ts)
- [db.ts](file://src/db/db.ts)
- [auth.ts](file://src/stores/auth.ts)
- [cart.ts](file://src/stores/cart.ts)
- [loyalty.ts](file://src/stores/loyalty.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction

This document provides comprehensive documentation for the Progressive Web App (PWA) support implementation in the Ngepos Point of Sale system. The application leverages modern web technologies to deliver an offline-first, installable, and responsive mobile-first POS solution for Indonesian F&B businesses.

The PWA implementation encompasses service worker caching, offline page handling, manifest configuration, and background synchronization capabilities. The system is built with SolidJS and follows a client-side rendering architecture optimized for both desktop and mobile environments.

## Project Structure

The PWA implementation is organized across several key directories and files:

```mermaid
graph TB
subgraph "Public Assets"
SW[Service Worker<br/>public/sw.js]
MAN[Manifest<br/>public/manifest.json]
OFF[Offline Page<br/>public/offline.html]
end
subgraph "Application Entry"
ENTRY_CLIENT[Client Entry<br/>src/entry-client.tsx]
ENTRY_SERVER[Server Entry<br/>src/entry-server.tsx]
APP[Main App<br/>src/app.tsx]
end
subgraph "Configuration"
VITE[Vite Config<br/>vite.config.ts]
BUILD[Build System]
end
subgraph "Data Layer"
DB[Dexie Database<br/>src/db/db.ts]
AUTH[Auth Store<br/>src/stores/auth.ts]
CART[Cart Store<br/>src/stores/cart.ts]
LOYALTY[Loyalty Store<br/>src/stores/loyalty.ts]
end
SW --> MAN
SW --> OFF
ENTRY_CLIENT --> APP
ENTRY_SERVER --> APP
VITE --> BUILD
APP --> DB
APP --> AUTH
APP --> CART
APP --> LOYALTY
```

**Diagram sources**
- [sw.js:1-107](file://public/sw.js#L1-L107)
- [manifest.json:1-28](file://public/manifest.json#L1-L28)
- [offline.html:1-142](file://public/offline.html#L1-L142)
- [app.tsx:1-42](file://src/app.tsx#L1-L42)
- [entry-client.tsx:1-5](file://src/entry-client.tsx#L1-L5)
- [entry-server.tsx:1-36](file://src/entry-server.tsx#L1-L36)
- [vite.config.ts:1-26](file://vite.config.ts#L1-L26)

**Section sources**
- [sw.js:1-107](file://public/sw.js#L1-L107)
- [manifest.json:1-28](file://public/manifest.json#L1-L28)
- [offline.html:1-142](file://public/offline.html#L1-L142)
- [app.tsx:1-42](file://src/app.tsx#L1-L42)
- [entry-client.tsx:1-5](file://src/entry-client.tsx#L1-L5)
- [entry-server.tsx:1-36](file://src/entry-server.tsx#L1-L36)
- [vite.config.ts:1-26](file://vite.config.ts#L1-L26)

## Core Components

### Service Worker Implementation

The service worker provides comprehensive offline functionality and background synchronization:

```mermaid
flowchart TD
INSTALL[Install Event] --> CACHE_STATIC[Cache Static Assets]
ACTIVATE[Activate Event] --> CLEAN_CACHE[Clean Old Caches]
FETCH[Fetch Event] --> CHECK_METHOD{HTTP Method?}
CHECK_METHOD --> |POST/PUT/DELETE| NETWORK_ONLY[Network Only]
CHECK_METHOD --> |GET| ONLINE_CHECK{Online?}
ONLINE_CHECK --> |Yes| TRY_NETWORK[Fetch from Network]
TRY_NETWORK --> CACHE_RESPONSE[Cache Response]
TRY_NETWORK --> RETURN_NETWORK[Return Network]
TRY_NETWORK --> HANDLE_ERROR{Network Error?}
HANDLE_ERROR --> |Yes| CHECK_CACHE[Check Cache]
HANDLE_ERROR --> |No| DONE[Complete]
CHECK_CACHE --> CACHE_HIT{Cache Hit?}
CACHE_HIT --> |Yes| RETURN_CACHE[Return Cached]
CACHE_HIT --> |No| RETURN_OFFLINE[Return Offline Page]
ONLINE_CHECK --> |No| CHECK_CACHE2[Check Cache]
CHECK_CACHE2 --> CACHE_HIT2{Cache Hit?}
CACHE_HIT2 --> |Yes| RETURN_CACHE2[Return Cached]
CACHE_HIT2 --> |No| RETURN_OFFLINE2[Return Offline Page]
RETURN_NETWORK --> DONE
RETURN_CACHE --> DONE
RETURN_CACHE2 --> DONE
RETURN_OFFLINE --> DONE
RETURN_OFFLINE2 --> DONE
```

**Diagram sources**
- [sw.js:10-62](file://public/sw.js#L10-L62)

### Manifest Configuration

The web app manifest defines installation properties and appearance characteristics:

| Property | Value | Purpose |
|----------|-------|---------|
| `name` | "Ngepos - Point of Sale" | Full application name |
| `short_name` | "Ngepos" | Abbreviated display name |
| `description` | Mobile-first POS system... | Application purpose |
| `start_url` | "/" | Initial page load |
| `display` | "standalone" | Fullscreen experience |
| `background_color` | "#ffffff" | Splash screen color |
| `theme_color` | "#e65a14" | Browser theme |
| `orientation` | "portrait-primary" | Preferred orientation |

**Section sources**
- [manifest.json:1-28](file://public/manifest.json#L1-L28)

### Offline Page Implementation

The offline page provides graceful degradation when connectivity is unavailable:

```mermaid
sequenceDiagram
participant Browser as Browser
participant ServiceWorker as ServiceWorker
participant Cache as Cache Storage
participant OfflinePage as Offline Page
Browser->>ServiceWorker : Request Resource
ServiceWorker->>ServiceWorker : Check Online Status
ServiceWorker->>Cache : Check Cache Match
Cache-->>ServiceWorker : Cache Miss
ServiceWorker->>ServiceWorker : Network Error
ServiceWorker->>OfflinePage : Return Offline HTML
OfflinePage->>Browser : Render Offline Message
OfflinePage->>Browser : Auto-reload on Connection
```

**Diagram sources**
- [sw.js:32-62](file://public/sw.js#L32-L62)
- [offline.html:134-141](file://public/offline.html#L134-L141)

**Section sources**
- [sw.js:32-62](file://public/sw.js#L32-L62)
- [offline.html:1-142](file://public/offline.html#L1-L142)

## Architecture Overview

The PWA architecture integrates multiple layers for optimal offline functionality and user experience:

```mermaid
graph TB
subgraph "Client Layer"
UI[User Interface<br/>SolidJS Components]
STORES[Application Stores<br/>Auth, Cart, Loyalty]
DATABASE[Local Database<br/>Dexie IndexedDB]
end
subgraph "Service Worker Layer"
SW[Service Worker]
CACHE[Cache Storage API]
SYNC[Background Sync]
PUSH[PUSH Notifications]
end
subgraph "Server Layer"
API[REST API]
AUTH[Authentication Service]
DATA[Business Logic]
end
subgraph "System Layer"
MANIFEST[Web App Manifest]
OFFLINE[Offline Page]
ICONS[App Icons]
end
UI --> STORES
STORES --> DATABASE
UI --> SW
SW --> CACHE
SW --> SYNC
SW --> PUSH
SW --> API
API --> AUTH
API --> DATA
MANIFEST --> UI
OFFLINE --> UI
ICONS --> UI
```

**Diagram sources**
- [app.tsx:24-41](file://src/app.tsx#L24-L41)
- [sw.js:10-98](file://public/sw.js#L10-L98)
- [db.ts:270-496](file://src/db/db.ts#L270-L496)

The architecture follows an offline-first principle where the service worker intercepts network requests and serves cached content when available, falling back to the offline page when connectivity is lost.

**Section sources**
- [app.tsx:24-41](file://src/app.tsx#L24-L41)
- [sw.js:10-98](file://public/sw.js#L10-L98)
- [db.ts:270-496](file://src/db/db.ts#L270-L496)

## Detailed Component Analysis

### Database Layer Integration

The application uses Dexie for client-side data persistence with comprehensive versioning:

```mermaid
classDiagram
class PosDatabase {
+products : EntityTable~Product~
+categories : EntityTable~Category~
+transactions : EntityTable~Transaction~
+transactionItems : EntityTable~TransactionItem~
+expenses : EntityTable~Expense~
+settings : EntityTable~AppSetting~
+staff : EntityTable~Staff~
+roles : EntityTable~Role~
+loyaltyPrograms : EntityTable~LoyaltyProgram~
+customerStamps : EntityTable~CustomerStamp~
+customerRewards : EntityTable~CustomerReward~
+version(number) stores()
+upgrade(callback)
}
class Product {
+string id
+string name
+number price
+number cogs
+string category
+number stock
+boolean isActive
+variants : VariantGroup[]
}
class Transaction {
+string id
+string receiptNumber
+number totalAmount
+number originalAmount
+number cogsTotal
+string paymentMethod
+number timestamp
+string status
+boolean isBackdated
}
class Staff {
+string id
+string name
+string roleId
+string pin
+string email
+string phone
+boolean isActive
+number createdAt
}
PosDatabase --> Product : manages
PosDatabase --> Transaction : manages
PosDatabase --> Staff : manages
```

**Diagram sources**
- [db.ts:270-496](file://src/db/db.ts#L270-L496)
- [db.ts:62-154](file://src/db/db.ts#L62-L154)
- [db.ts:82-154](file://src/db/db.ts#L82-L154)

The database supports multiple versions with automatic migration, ensuring backward compatibility as features evolve.

**Section sources**
- [db.ts:270-496](file://src/db/db.ts#L270-L496)
- [db.ts:62-154](file://src/db/db.ts#L62-L154)

### Authentication Store Architecture

The authentication system implements optimistic loading with local storage caching:

```mermaid
sequenceDiagram
participant App as Application
participant AuthStore as Auth Store
participant LocalStorage as Local Storage
participant API as Authentication API
participant Server as Server
App->>AuthStore : initAuth()
AuthStore->>LocalStorage : Check auth_user_cache
LocalStorage-->>AuthStore : Cached User Data
AuthStore->>AuthStore : Set Optimistic UI
AuthStore->>LocalStorage : Check auth_token
LocalStorage-->>AuthStore : Token Present
AuthStore->>API : GET /api/auth/me
API->>Server : Verify Token
Server-->>API : User Data
API-->>AuthStore : Valid Response
AuthStore->>LocalStorage : Update Cache
AuthStore->>AuthStore : Set Current User
AuthStore->>AuthStore : Set Auth Complete
```

**Diagram sources**
- [auth.ts:11-56](file://src/stores/auth.ts#L11-L56)

**Section sources**
- [auth.ts:11-56](file://src/stores/auth.ts#L11-L56)

### Shopping Cart Management

The cart system handles complex variant combinations and promotional calculations:

```mermaid
flowchart TD
ADD_ITEM[Add to Cart] --> CHECK_VARIANTS{Has Variants?}
CHECK_VARIANTS --> |No| CREATE_ITEM[Create Cart Item]
CHECK_VARIANTS --> |Yes| SORT_VARIANTS[Sort Variants]
SORT_VARIANTS --> GENERATE_HASH[Generate Variant Hash]
GENERATE_HASH --> FIND_EXISTING[Find Existing Item]
FIND_EXISTING --> INCREMENT[Increment Quantity]
FIND_EXISTING --> CREATE_NEW[Create New Item]
CREATE_ITEM --> UPDATE_STORE[Update Store]
INCREMENT --> UPDATE_STORE
CREATE_NEW --> UPDATE_STORE
UPDATE_QUANTITY[Update Quantity] --> CALCULATE[Calculate New Quantity]
CALCULATE --> FILTER_EMPTY[Filter Zero Quantity]
FILTER_EMPTY --> UPDATE_STORE
CALCULATE_DISCOUNTS[Calculate Discounts] --> GET_CAMPAIGNS[Get Active Campaigns]
GET_CAMPAIGNS --> CHECK_BULK[Bulk Discount Check]
CHECK_BULK --> APPLY_BULK[Apply Bulk Discount]
CHECK_BULK --> CHECK_BUNDLE[Bundle Check]
CHECK_BUNDLE --> APPLY_BUNDLE[Apply Bundle Discount]
APPLY_BULK --> TOTAL_DISCOUNT[Calculate Total]
APPLY_BUNDLE --> TOTAL_DISCOUNT
```

**Diagram sources**
- [cart.ts:16-106](file://src/stores/cart.ts#L16-L106)
- [cart.ts:132-236](file://src/stores/cart.ts#L132-L236)

**Section sources**
- [cart.ts:16-106](file://src/stores/cart.ts#L16-L106)
- [cart.ts:132-236](file://src/stores/cart.ts#L132-L236)

### Background Synchronization

The service worker implements background synchronization for transaction data:

```mermaid
sequenceDiagram
participant ServiceWorker as ServiceWorker
participant Clients as Client Applications
participant MessageChannel as Message Channel
ServiceWorker->>ServiceWorker : Background Sync Event
ServiceWorker->>ServiceWorker : Check Sync Tag
ServiceWorker->>Clients : matchAll()
Clients-->>ServiceWorker : Client List
ServiceWorker->>MessageChannel : postMessage()
MessageChannel-->>ServiceWorker : Message Sent
ServiceWorker->>ServiceWorker : Handle Sync Trigger
ServiceWorker->>ServiceWorker : Process Pending Transactions
ServiceWorker->>ServiceWorker : Update UI State
```

**Diagram sources**
- [sw.js:64-79](file://public/sw.js#L64-L79)

**Section sources**
- [sw.js:64-79](file://public/sw.js#L64-L79)

## Dependency Analysis

The PWA implementation relies on several key dependencies and their interactions:

```mermaid
graph LR
subgraph "Core Dependencies"
SOLID[SolidJS Runtime]
DEXIE[Dexie IndexedDB]
SERVICE_WORKER[Service Worker API]
end
subgraph "PWA Features"
CACHE[Cache Storage API]
SYNC[Background Sync]
PUSH[PUSH Notifications]
OFFLINE[Offline Handling]
end
subgraph "Application Layer"
AUTH[Authentication Store]
CART[Shopping Cart]
LOYALTY[Loyalty System]
DATABASE[Local Database]
end
SOLID --> AUTH
SOLID --> CART
SOLID --> LOYALTY
DEXIE --> DATABASE
SERVICE_WORKER --> CACHE
SERVICE_WORKER --> SYNC
SERVICE_WORKER --> PUSH
CACHE --> OFFLINE
SYNC --> AUTH
PUSH --> AUTH
DATABASE --> CART
DATABASE --> LOYALTY
```

**Diagram sources**
- [app.tsx:1-42](file://src/app.tsx#L1-L42)
- [db.ts:1-570](file://src/db/db.ts#L1-L570)
- [sw.js:1-107](file://public/sw.js#L1-L107)

The dependency graph shows how the application maintains loose coupling between components while leveraging shared PWA capabilities.

**Section sources**
- [app.tsx:1-42](file://src/app.tsx#L1-L42)
- [db.ts:1-570](file://src/db/db.ts#L1-L570)
- [sw.js:1-107](file://public/sw.js#L1-L107)

## Performance Considerations

The PWA implementation incorporates several performance optimization strategies:

### Caching Strategy
- **Static Assets**: Cached during installation for immediate offline access
- **Dynamic Content**: Network-first approach with intelligent caching
- **Cache Invalidation**: Pattern-based invalidation for real-time data updates

### Database Optimization
- **IndexedDB**: Efficient client-side storage with structured data
- **Version Migration**: Seamless database upgrades without data loss
- **Query Optimization**: Indexed fields for fast data retrieval

### Memory Management
- **Store Patterns**: Efficient state management with SolidJS signals
- **Lazy Loading**: On-demand resource loading
- **Cleanup Procedures**: Proper resource deallocation

## Troubleshooting Guide

### Common Issues and Solutions

**Service Worker Not Activating**
- Clear browser cache and service worker registrations
- Check console for installation errors
- Verify manifest.json validity

**Offline Mode Problems**
- Ensure offline.html is properly cached
- Check network requests during offline periods
- Verify cache storage limits

**Authentication Issues**
- Clear local storage tokens
- Check token expiration
- Verify server connectivity

**Database Migration Failures**
- Review version upgrade logs
- Check for data consistency
- Implement manual migration if needed

**Section sources**
- [sw.js:19-30](file://public/sw.js#L19-L30)
- [offline.html:134-141](file://public/offline.html#L134-L141)
- [auth.ts:42-46](file://src/stores/auth.ts#L42-L46)

## Conclusion

The Ngepos PWA implementation provides a robust, offline-first solution for Indonesian F&B businesses. The architecture successfully combines modern web technologies with practical business requirements, delivering an installable, responsive, and resilient point-of-sale system.

Key achievements include comprehensive offline functionality, efficient client-side data management, and seamless background synchronization. The modular design ensures maintainability while the offline-first approach guarantees reliable operation in challenging network conditions.

Future enhancements could include push notification implementation, improved cache management strategies, and expanded offline functionality for additional business features.