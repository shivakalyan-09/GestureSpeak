package com.gesturespeak.backend.config;

import com.gesturespeak.backend.service.FirebaseService;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Firebase ID Token verification filter.
 *
 * Security fixes applied:
 *  AUTH-001 – Removed hardcoded "mock-admin-token" backdoor
 *  AUTH-002 – Fails closed (HTTP 503) when Firebase is not configured
 *  AUTH-003 – Fails closed (HTTP 401) when token verification fails
 *  AUTH-004 – Removed "mock-user-token" wildcard bypass
 *  AUTHZ-003 – Admin role granted ONLY via Firebase custom claim "admin: true";
 *              email-based role assignment removed
 */
@Component
public class FirebaseTokenFilter extends OncePerRequestFilter {

    private final FirebaseService firebaseService;

    public FirebaseTokenFilter(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            // No token provided – let Spring Security decide (public routes will pass through)
            filterChain.doFilter(request, response);
            return;
        }

        // AUTH-002: Fail closed if Firebase is not properly initialised.
        // We cannot verify any token without real credentials, so reject all requests.
        if (!firebaseService.isFirebaseInitialized()) {
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"error\":\"Authentication service is not available. " +
                "Please contact the administrator.\"}"
            );
            return;
        }

        String idToken = header.substring(7);

        try {
            // AUTH-003: Verify the real Firebase ID token.
            // Any failure (expired, forged, revoked) returns HTTP 401 – no fallback.
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
            String uid   = decodedToken.getUid();

            // AUTHZ-003: Admin role ONLY from a Firebase custom claim – never from email.
            boolean isAdmin = decodedToken.getClaims() != null
                    && Boolean.TRUE.equals(decodedToken.getClaims().get("admin"));

            setAuth(uid, isAdmin, request);
            filterChain.doFilter(request, response);

        } catch (Exception ex) {
            // AUTH-003: Fail closed – do NOT fall back to a dev/mock user.
            SecurityContextHolder.clearContext();
            logger.warn("[FirebaseTokenFilter] Token verification failed: " + ex.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Invalid or expired authentication token.\"}");
            // Do NOT call filterChain.doFilter() – request is rejected.
        }
    }

    private void setAuth(String uid, boolean isAdmin, HttpServletRequest request) {
        List<SimpleGrantedAuthority> authorities = isAdmin
                ? List.of(new SimpleGrantedAuthority("ROLE_ADMIN"),
                          new SimpleGrantedAuthority("ROLE_USER"))
                : List.of(new SimpleGrantedAuthority("ROLE_USER"));

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(uid, null, authorities);
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
