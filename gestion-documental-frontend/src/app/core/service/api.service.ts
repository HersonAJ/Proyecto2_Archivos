import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment.development";

@Injectable({ providedIn: 'root'})
export class ApiService {
    protected readonly baseUrl = environment.apiUrl;

    constructor(protected http: HttpClient) {}
}