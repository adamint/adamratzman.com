import { Sha256 } from '@aws-crypto/sha256-browser';
import base64url from 'base64url';
import axios, { AxiosResponse } from 'axios';
import SpotifyWebApi from 'spotify-web-api-js';
import { useEffect, useState } from 'react';

export interface PkceGuardedSpotifyWebApiJs {
  getApi: () => Promise<SpotifyWebApi.SpotifyWebApiJs>;
}

export function useSpotifyWebApiGuardValidPkceToken(clientId: string, spotifyTokenInfo: SpotifyTokenInfo | null, setSpotifyTokenInfo: Function): PkceGuardedSpotifyWebApiJs {
  const spotifyApi = new SpotifyWebApi();

  return {
    async getApi(): Promise<SpotifyWebApi.SpotifyWebApiJs> {
      if (spotifyTokenInfo !== null) {
        if (spotifyTokenInfo.expiry < Date.now()) {
          if (spotifyTokenInfo.token.refresh_token) {
            const token = await doSpotifyPkceRefresh(clientId, spotifyTokenInfo.token.refresh_token, setSpotifyTokenInfo);
            if (token) spotifyApi.setAccessToken(token.access_token);
            else spotifyApi.setAccessToken(null);
          } else {
            setSpotifyTokenInfo(null);
            spotifyApi.setAccessToken(null);
          }
        } else spotifyApi.setAccessToken(spotifyTokenInfo.token.access_token);
      }

      return spotifyApi;
    },
  };
}


export async function getPkceAuthUrlFull(scopes: string[], clientId: string, redirectUri: string, codeVerifier: string, state: string | null): Promise<string> {
  if (codeVerifier.length < 43 || codeVerifier.length > 128) throw new Error('Code verifier must be between 43..128 characters long');
  const codeChallenge = await getCodeChallengeForCodeVerifier(codeVerifier);

  let url = `https://accounts.spotify.com/authorize/?client_id=${clientId}`
    + `&response_type=code`
    + `&redirect_uri=${redirectUri}`
    + `&code_challenge_method=S256`
    + `&code_challenge=${codeChallenge}`;

  if (state) url += `&state=${state}`;
  if (scopes.length > 0) url += `&scope=${scopes.join('%20')}`;

  return url;
}

export async function getCodeChallengeForCodeVerifier(codeVerifier: string): Promise<string> {
  const hash = new Sha256();
  hash.update(codeVerifier);
  const result = await hash.digest();
  // @ts-ignore
  return base64url(result);
}

export function logoutOfSpotify() {
  localStorage.removeItem('spotify_pkce_callback_code');
  localStorage.removeItem('spotify_redirect_after_auth');
  localStorage.removeItem('spotify_token');
}

export async function redirectToSpotifyLogin(codeVerifier: string, redirectPathAfter: string, setCodeVerifier: Function, scopes: string[], clientId: string, redirectUri: string, state: string | null = null) {
  localStorage.setItem('spotify_code_verifier', codeVerifier);
  localStorage.setItem('spotify_redirect_after_auth', redirectPathAfter);
  setCodeVerifier(codeVerifier);
  window.location.href = await getPkceAuthUrlFull(scopes, clientId, redirectUri, codeVerifier, state);
}

export async function doSpotifyPkceRefresh(clientId: string, refreshToken: string, setSpotifyTokenInfo: Function): Promise<SpotifyToken | null> {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('client_id', clientId);

  try {
    const pkceResponse = await axios.post<URLSearchParams, AxiosResponse<SpotifyToken>>('https://accounts.spotify.com/api/token', params);
    const token = pkceResponse.data;
    saveTokenAndGetRedirectPath(token, setSpotifyTokenInfo);
    console.log('refreshed token via pkce');
    return token;
  } catch (e) {
    console.log(e)
    setSpotifyTokenInfo(null);
    logoutOfSpotify();
    return null;
  }
}

export function saveTokenAndGetRedirectPath(token: SpotifyToken, setSpotifyTokenInfo: Function) {
  const tokenInfo = {
    expiry: Date.now() + token.expires_in * 1000,
    token: token,
  };

  localStorage.setItem('spotify_token', JSON.stringify(tokenInfo));
  setSpotifyTokenInfo(tokenInfo);

  localStorage.removeItem('spotify_pkce_callback_code');
  const pathToRedirectTo = localStorage.getItem('spotify_redirect_after_auth');
  localStorage.removeItem('spotify_redirect_after_auth');
  return pathToRedirectTo;
}

export type SpotifyTokenInfo = {
  expiry: number;
  token: SpotifyToken
}

export type SpotifyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string | null;
  scope: string | null
}