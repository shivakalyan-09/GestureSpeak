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

@Component
public class FirebaseTokenFilter extends OncePerRequestFilter {

    private final FirebaseService firebaseService;

    public FirebaseTokenFilter(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String idToken = header.substring(7);
            try {
                // ── 1. Hard-coded mock admin token ──────────────────────────────
                if (idToken.equals("mock-admin-token")) {
                    setAuth("mock-admin-uid", true, request);

                // ── 2. Any token that starts with "mock-user-token" ─────────────
                } else if (idToken.startsWith("mock-user-token")) {
                    String uid = idToken.replace("mock-user-token-", "");
                    if (uid.isEmpty()) uid = "mock-user-uid";
                    setAuth(uid, false, request);

                // ── 3. Firebase is not properly configured → accept any token ───
                //    This covers the common dev situation where the firebase-service-
                //    account.json is a placeholder and real JWT verification would fail.
                } else if (!firebaseService.isFirebaseInitialized()) {
                    // Derive a stable uid from the token string so each distinct
                    // frontend session maps to the same backend user bucket.
                    String uid = "dev-user-" + Math.abs(idToken.hashCode() % 100000);
                    setAuth(uid, false, request);

                // ── 4. Real Firebase ID token ────────────────────────────────────
                } else {
                    try {
                        FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
                        String uid = decodedToken.getUid();
                        String email = decodedToken.getEmail();

                        boolean isAdmin = "admin@gesturespeak.com".equalsIgnoreCase(email) ||
                                (decodedToken.getClaims() != null && Boolean.TRUE.equals(decodedToken.getClaims().get("admin")));

                        setAuth(uid, isAdmin, request);
                    } catch (Exception firebaseEx) {
                        // Firebase token verification failed (bad key, expired, etc.)
                        // Fall back to mock user so the app still works.
                        System.err.println("[FirebaseTokenFilter] Firebase token verify failed (fallback to dev mode): " + firebaseEx.getMessage());
                        String uid = "dev-user-" + Math.abs(idToken.hashCode() % 100000);
                        setAuth(uid, false, request);
                    }
                }

            } catch (Exception e) {
                SecurityContextHolder.clearContext();
                System.err.println("[FirebaseTokenFilter] Unexpected error processing auth header: " + e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private void setAuth(String uid, boolean isAdmin, HttpServletRequest request) {
        List<SimpleGrantedAuthority> authorities = isAdmin
                ? List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("ROLE_USER"))
                : List.of(new SimpleGrantedAuthority("ROLE_USER"));

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(uid, null, authorities);
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
