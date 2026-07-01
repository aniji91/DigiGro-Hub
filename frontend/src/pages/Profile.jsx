import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { changePassword, fetchMe, updateProfile } from "../api/authApi";
import { ROLE_COLORS } from "../config/menuConfig";
import PageHeader from "../components/PageHeader";

const EMPTY_PROFILE = { name: "", username: "", email: "", department: "", position: "" };

export default function Profile() {
  const { user, roleLabel, updateUser } = useAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const data = await fetchMe();
        if (!active) return;
        setProfile({
          name: data.name || "",
          username: data.username || "",
          email: data.email || "",
          department: data.department || "",
          position: data.position || "",
        });
      } catch (err) {
        if (active) setProfileError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setProfileSaving(true);

    try {
      const updated = await updateProfile({
        name: profile.name,
        username: profile.username,
      });
      updateUser(updated);
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage("Password updated successfully.");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return <div className="loading-state">Loading profile...</div>;
  }

  return (
    <>
      <PageHeader title="My Profile" subtitle="Update your account details and password" />

      <div className="profile-grid">
        <div className="panel profile-panel">
          <h3>Account details</h3>
          <p className="muted profile-intro">
            Role: <strong style={{ color: ROLE_COLORS[user.role] }}>{roleLabel}</strong>
          </p>

          {profileError && <div className="alert error">{profileError}</div>}
          {profileMessage && <div className="alert success">{profileMessage}</div>}

          <form className="profile-form" onSubmit={handleProfileSubmit}>
            <label className="pm-field">
              <span className="pm-field__label">Full name</span>
              <input
                className="pm-field__control"
                value={profile.name}
                onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>

            <label className="pm-field">
              <span className="pm-field__label">Username</span>
              <input
                className="pm-field__control"
                value={profile.username}
                onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))}
                required
                autoComplete="username"
              />
            </label>

            {profile.email && (
              <label className="pm-field">
                <span className="pm-field__label">Email</span>
                <input className="pm-field__control" value={profile.email} disabled />
              </label>
            )}

            {(profile.department || profile.position) && (
              <div className="profile-readonly-row">
                {profile.department && (
                  <label className="pm-field">
                    <span className="pm-field__label">Department</span>
                    <input className="pm-field__control" value={profile.department} disabled />
                  </label>
                )}
                {profile.position && (
                  <label className="pm-field">
                    <span className="pm-field__label">Position</span>
                    <input className="pm-field__control" value={profile.position} disabled />
                  </label>
                )}
              </div>
            )}

            <div className="profile-form-actions">
              <button type="submit" className="btn primary" disabled={profileSaving}>
                {profileSaving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </div>

        <div className="panel profile-panel">
          <h3>Change password</h3>
          <p className="muted profile-intro">
            Use a strong password with at least 6 characters.
          </p>

          {passwordError && <div className="alert error">{passwordError}</div>}
          {passwordMessage && <div className="alert success">{passwordMessage}</div>}

          <form className="profile-form" onSubmit={handlePasswordSubmit}>
            <label className="pm-field">
              <span className="pm-field__label">Current password</span>
              <input
                type="password"
                className="pm-field__control"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                required
                autoComplete="current-password"
              />
            </label>

            <label className="pm-field">
              <span className="pm-field__label">New password</span>
              <input
                type="password"
                className="pm-field__control"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                required
                minLength={6}
                autoComplete="new-password"
              />
            </label>

            <label className="pm-field">
              <span className="pm-field__label">Confirm new password</span>
              <input
                type="password"
                className="pm-field__control"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                required
                minLength={6}
                autoComplete="new-password"
              />
            </label>

            <div className="profile-form-actions">
              <button type="submit" className="btn primary" disabled={passwordSaving}>
                {passwordSaving ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <p className="muted profile-footer-note">
        Contact your administrator if you need help with another user account.
      </p>
    </>
  );
}
