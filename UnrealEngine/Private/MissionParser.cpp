// Fill out your copyright notice in the Description page of Project Settings.

#include "MissionParser.h"

#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

static TSharedPtr<FJsonObject> ParseJsonObject(const FString& Json)
{
	TSharedPtr<FJsonObject> Object;
	TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Json);
	if (!FJsonSerializer::Deserialize(Reader, Object) || !Object.IsValid())
	{
		return nullptr;
	}
	return Object;
}

FString UMissionParser::GetEventName(const FString& Json)
{
	const TSharedPtr<FJsonObject> Root = ParseJsonObject(Json);
	FString Event;
	if (Root.IsValid())
	{
		Root->TryGetStringField(TEXT("event"), Event);
	}
	return Event;
}

bool UMissionParser::ParseMissionAssigned(const FString& Json, FVehicleMission& OutMission)
{
	OutMission = FVehicleMission();

	const TSharedPtr<FJsonObject> Root = ParseJsonObject(Json);
	if (!Root.IsValid())
	{
		UE_LOG(LogTemp, Warning, TEXT("MissionParser: invalid JSON"));
		return false;
	}

	FString Event;
	if (!Root->TryGetStringField(TEXT("event"), Event) || Event != TEXT("MISSION_ASSIGNED"))
	{
		return false;
	}

	const TSharedPtr<FJsonObject>* VehiclePtr = nullptr;
	if (!Root->TryGetObjectField(TEXT("vehicle"), VehiclePtr) || !VehiclePtr || !VehiclePtr->IsValid())
	{
		UE_LOG(LogTemp, Warning, TEXT("MissionParser: missing 'vehicle' object"));
		return false;
	}
	const TSharedPtr<FJsonObject>& V = *VehiclePtr;

	V->TryGetNumberField(TEXT("id"), OutMission.Id);
	V->TryGetStringField(TEXT("brand"), OutMission.Brand);
	V->TryGetStringField(TEXT("v_type"), OutMission.VehicleType);
	V->TryGetStringField(TEXT("status"), OutMission.Status);
	V->TryGetNumberField(TEXT("start_lat"), OutMission.StartLat);
	V->TryGetNumberField(TEXT("start_lng"), OutMission.StartLng);
	V->TryGetNumberField(TEXT("dest_lat"), OutMission.DestLat);
	V->TryGetNumberField(TEXT("dest_lng"), OutMission.DestLng);
	V->TryGetStringField(TEXT("mission_purpose"), OutMission.MissionPurpose);
	V->TryGetNumberField(TEXT("distance_km"), OutMission.DistanceKm);
	V->TryGetNumberField(TEXT("duration_min"), OutMission.DurationMin);

	const TArray<TSharedPtr<FJsonValue>>* Route = nullptr;
	if (V->TryGetArrayField(TEXT("route_coordinates"), Route) && Route)
	{
		OutMission.RouteCoordinates.Reserve(Route->Num());
		for (const TSharedPtr<FJsonValue>& Item : *Route)
		{
			const TArray<TSharedPtr<FJsonValue>>* Pair = nullptr;
			if (Item.IsValid() && Item->TryGetArray(Pair) && Pair && Pair->Num() >= 2)
			{
				// [lng, lat]
				OutMission.RouteCoordinates.Add(FVector2D((*Pair)[0]->AsNumber(), (*Pair)[1]->AsNumber()));
			}
		}
	}

	return true;
}