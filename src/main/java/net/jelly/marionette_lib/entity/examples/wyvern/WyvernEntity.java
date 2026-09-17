package net.jelly.marionette_lib.entity.examples.wyvern;

import net.jelly.marionette_lib.utility.FabrikAnimator;
import net.jelly.marionette_lib.utility.Limb;
import net.jelly.marionette_lib.utility.Marionette;
import net.jelly.marionette_lib.utility.MarionettePart;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.monster.Phantom;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;

import java.util.ArrayList;
import java.util.List;

public class WyvernEntity extends Phantom implements Marionette {
    private static final int LEG_COUNT = 4;

    private final Limb<MarionettePart<WyvernEntity>> body;
    private final List<Limb<MarionettePart<WyvernEntity>>> legs = new ArrayList<>();
    private final boolean[] legReturning = new boolean[LEG_COUNT];

    public WyvernEntity(EntityType entityType, Level level) {
        super(entityType, level);
        body = Limb.builder(this)
                .segments(10, 0.5f, 0.5f, 0.5f)
                .followRootOnly(true)
                .build();

        for (int i = 0; i < LEG_COUNT; i++) {
            legs.add(Limb.builder(this)
                    .segments(2, 0.25f, 0.25f, 1f)
                    .build());
        }
    }

    @Override
    public List<Limb<?>> getLimbs() {
        List<Limb<?>> all = new ArrayList<>();
        all.add(body);
        all.addAll(legs);
        return all;
    }

    @Override
    public boolean isMultipartEntity() {
        return true;
    }

    @Override
    public PartEntity<?>[] getParts() {
        return getMarionetteParts();
    }

    @Override
    public void remove(RemovalReason removalReason) {
        super.remove(removalReason);
        removeMarionette(removalReason);
    }

    public void tick() {
        super.tick();

        for (int i = 0; i < LEG_COUNT; i++) {
            stepLeg(i);
        }

        tickMarionette();
    }

    /** Keeps leg {@code i}'s foot near its resting spot relative to the body, stepping when it drifts too far. */
    private void stepLeg(int i) {
        FabrikAnimator legAnimator = legs.get(i).animator();
        int rootIndex = i <= 1 ? 1 : 5;
        MarionettePart<WyvernEntity> rootPart = body.parts()[rootIndex];
        int bodySide = i % 2 == 0 ? -1 : 1;

        legAnimator.setRoot(rootPart.position());
        Vec3 direction = body.parts()[rootIndex - 1].position().subtract(rootPart.position()).normalize();
        Vec3 legRest = rootPart.position()
                .add(direction.cross(new Vec3(0, 1, 0)).normalize().scale(1.5f * bodySide))
                .add(direction.normalize().scale(1.25f));

        if (legAnimator.chainEndPos().distanceTo(legRest) > 2f) {
            legReturning[i] = true;
        }

        if (legReturning[i]) {
            legAnimator.setFabrikTarget(legAnimator.chainEndPos()
                    .add(legRest.subtract(legAnimator.chainEndPos()).normalize()
                            .scale(this.getDeltaMovement().dot(legRest.subtract(legAnimator.chainEndPos()))))
                    .add(legRest.subtract(legAnimator.chainEndPos()).scale(0.25))
                    .add(legRest.subtract(legAnimator.chainEndPos()).normalize().scale(0.1))
            );
            if (legAnimator.chainEndPos().distanceTo(legRest) < 0.6) {
                legReturning[i] = false;
            }
        }
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Animal.createLivingAttributes()
                .add(Attributes.MAX_HEALTH, 20D)
                .add(Attributes.FOLLOW_RANGE, 24D)
                .add(Attributes.MOVEMENT_SPEED, 0.25D)
                .add(Attributes.ARMOR_TOUGHNESS, 0.1f)
                .add(Attributes.ATTACK_KNOCKBACK, 0.5f)
                .add(Attributes.ATTACK_DAMAGE, 2f);
    }

    @Override
    protected boolean isSunBurnTick() {
        return false;
    }

    @Override
    protected InteractionResult mobInteract(Player pPlayer, InteractionHand pHand) {
        if (this.level().isClientSide) Minecraft.getInstance().player.sendSystemMessage(Component.literal("squelch client"));
        else Minecraft.getInstance().player.sendSystemMessage(Component.literal("squelch server"));
        return super.mobInteract(pPlayer, pHand);
    }
}
