#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "WebSocketSubsystem.generated.h"

class IWebSocket;

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FWSConnectedDelegate);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FWSErrorDelegate, const FString&, Error);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FWSClosedDelegate, int32, StatusCode, const FString&, Reason, bool, bWasClean);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FWSMessageDelegate, const FString&, Message);

/**
 * Klient WebSocket dostępny z Blueprintów.
 * W Blueprint: "Get WebSocket Subsystem" -> Connect / Send Message / Disconnect.
 */
UCLASS()
class FLEET_MANAGEMENT_SIM_API UWebSocketSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Deinitialize() override;

	/** Łączy z serwerem, np. ws://127.0.0.1:8080 lub wss://example.com/socket */
	UFUNCTION(BlueprintCallable, Category = "WebSocket")
	void Connect(const FString& Url, const FString& Protocol, const TMap<FString, FString>& Headers);

	UFUNCTION(BlueprintCallable, Category = "WebSocket")
	void Disconnect(int32 Code = 1000, const FString& Reason = TEXT(""));

	UFUNCTION(BlueprintCallable, Category = "WebSocket")
	void SendMessage(const FString& Message);

	UFUNCTION(BlueprintPure, Category = "WebSocket")
	bool IsConnected() const;

	UPROPERTY(BlueprintAssignable, Category = "WebSocket")
	FWSConnectedDelegate OnConnected;

	UPROPERTY(BlueprintAssignable, Category = "WebSocket")
	FWSErrorDelegate OnConnectionError;

	UPROPERTY(BlueprintAssignable, Category = "WebSocket")
	FWSClosedDelegate OnClosed;

	UPROPERTY(BlueprintAssignable, Category = "WebSocket")
	FWSMessageDelegate OnMessageReceived;

private:
	void HandleConnected();
	void HandleConnectionError(const FString& Error);
	void HandleClosed(int32 StatusCode, const FString& Reason, bool bWasClean);
	void HandleMessage(const FString& Message);

	void CloseAndReset(int32 Code, const FString& Reason);

	TSharedPtr<IWebSocket> Socket;
};